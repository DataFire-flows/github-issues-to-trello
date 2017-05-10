const datafire = require('datafire');
const trello = require('@datafire/trello').actions;
const github = require('@datafire/github').actions;

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
  handler: (input, context) => {
    let [owner, repo] = input.repo.split('/');
    return datafire.flow(context)
      .then(_ => trello.getMembersBoardsByIdMember({idMember: 'me'}, context))
      .then(boards => {
        let board = context.results.boards.filter(board => {
          return board.name === input.board || board.id == input.board;
        })[0];
        if (!board) throw new Error("Board " + input.board + " not found");
        return board;
      })
      .then(board => {
        let allIssues = [];
        function getNextPage(issues) {
          if (issues && !issues.length) return Promise.resolve();
          allIssues = allIssues.concat(issues || []);
          let page = 1;
          return github.repos.owner.repo.issues.get({
            owner,
            repo,
            state: 'open',
            page: page++,
          }, context)
        }
        return getNextPage();
      })
      .then(issues => {
        return github.repos.owner.repo.milestones.get({
          owner,
          repo,
        }, context);
      })
      .then(milestones => {
        return trello.getBoardsCardsByIdBoard({
          idBoard: context.results.board.id,
          filter: 'open',
        }, context)
      })
      .then(cards => {
        return trello.getBoardsListsByIdBoard({
          idBoard: context.results.board.id,
        }, context)
      })
      .then(lists => {
        let listsInTrello = context.results.lists.map(l => l.name);
        let milestones = context.results.milestones.concat([{title: "None"}]);
        let newMilestones = milestones.filter(milestone => {
          return listsInTrello.indexOf("Milestone: " + milestone.title) === -1;
        })
        return Promise.all(newMilestones.map(milestone => {
          return trello.addLists({
            body: {
              idBoard: context.results.board.id,
              name: "Milestone: " + milestone.title,
            }
          }, context)
        }))
      })
      .then(createdLists => {
        let trelloCardBodies = context.results.cards.map(c => c.desc);
        let newIssues = context.results.issues.filter(i => {
          return trelloCardBodies.indexOf('GitHub Issue ' + i.number) === -1;
        });
        let allLists = context.results.lists.concat(createdLists);
        return Promise.all(newIssues.map(issue => {
          var list = allLists.filter(list => {
            let milestone = issue.milestone || 'None';
            return list.name === 'Milestone: ' + milestone;
          })[0];
          return trello.addCards({
            body: {
              idBoard: context.results.board.id,
              idList: list.id,
              desc: "GitHub Issue " + issue.number,
              name: issue.title,
            }
          }, context)
        }))
      })
      .then(createdCards => {
        let openIssueDescriptions = context.results.issues.map(i => "GitHub Issue " + i.number);
        let closedCards = context.results.cards.filter(card => openIssueDescriptions.indexOf(card.desc) === -1);
        return Promise.all(closedCards.map(card => {
          return trello.updateCardsClosedByIdCard({
            idCard: card.id,
            body: {value: true},
          }, context)
        }))
      })
  }
})
