"use strict";

const datafire = require('datafire');
const accounts = datafire.Project.main().accounts;
const trello = require('@datafire/trello').create(accounts.trello);
const github = require('@datafire/github').create(accounts.github);

module.exports = new datafire.Action({
  title: "Sync GitHub Issues to Trello",
  description: "Create a Trello list for every Milestone, and a card for every Issue",
  inputs: [{
    title: 'repo',
    type: 'string',
    description: "The GitHub repo to pull issues from",
  }, {
    title: 'board',
    type: 'string',
    description: "Name or ID of the Trello board to push to",
  }],
  handler: async (input, context) => {
    let [owner, repo] = input.repo.split('/');
    let boards = await trello.getMembersBoardsByIdMember({idMember: 'me'});
    let board = boards.filter(board => {
      return board.name === input.board || board.id == input.board;
    })[0];
    if (!board) throw new Error("Board " + input.board + " not found");

    let allIssues = [];
    async function addPage(idx) {
      let issues = await github.repos.owner.repo.issues.get({
        owner,
        repo,
        state: 'open',
        labels: '',
        page: idx,
      });
      allIssues = allIssues.concat(issues);
      if (issues.length) {
        return addPage(idx + 1);
      } else {
        return Promise.resolve(allIssues);
      }
    }
    allIssues = await addPage(1);
    console.log('found ' + allIssues.length + ' issues');

    let milestones = await github.repos.owner.repo.milestones.get({owner, repo})
    let cards = await trello.getBoardsCardsByIdBoard({
      idBoard: board.id,
      filter: 'open',
    })
    let lists = await trello.getBoardsListsByIdBoard({
      idBoard: board.id,
    });

    let listsInTrello = lists.map(l => l.name);
    milestones = milestones.concat([{title: "None"}]);
    let newMilestones = milestones.filter(milestone => {
      return listsInTrello.indexOf("Milestone: " + milestone.title) === -1;
    })
    let createdLists = await Promise.all(newMilestones.map(milestone => {
      return trello.addLists({
        body: {
          idBoard: board.id,
          name: "Milestone: " + milestone.title,
        }
      })
    }))

    let trelloCardBodies = cards.map(c => c.desc);
    let newIssues = allIssues.filter(i => {
      return trelloCardBodies.indexOf('GitHub Issue ' + i.number) === -1;
    });
    let allLists = lists.concat(createdLists);
    let createdCards = await Promise.all(newIssues.map(issue => {
      var list = allLists.filter(list => {
        let milestone = issue.milestone ? issue.milestone.title : 'None';
        return list.name === 'Milestone: ' + milestone;
      })[0];
      return trello.addCards({
        body: {
          idBoard: board.id,
          idList: list.id,
          desc: "GitHub Issue " + issue.number,
          name: issue.title,
        }
      });
    }));

    let openIssueDescriptions = allIssues.map(i => "GitHub Issue " + i.number);
    let closedCards = cards.filter(card => openIssueDescriptions.indexOf(card.desc) === -1);
    await Promise.all(closedCards.map(card => {
      return trello.updateCardsClosedByIdCard({
        idCard: card.id,
        body: {value: true},
      })
    }));
    return {
      closed: closedCards.length,
      created: createdCards.length,
    }
  }
})
