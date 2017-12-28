# Sync GitHub Issues to Trello

## Setup

You'll need to authorize Trello by running
```
datafire authenticate trello --alias trello
```

You can find your `key` here:
https://trello.com/app-key

You can generate a `token` by clicking the link to "Token" on the page above, or by adding your `key` to this URL:

https://trello.com/1/authorize?expiration=never&scope=read,write,account&response_type=token&name=Server%20Token&key=

## Running

Once you've added a Trello account, you can run:
```
datafire run ./sync_github_to_trello.js -i.repo torvalds/linux -i.board "Linux Issues"
```

replacing `i.repo`, and `i.board` with the repository and Trello board you want to sync.

## Run on a Schedule

Edit the task in DataFire.yml with the repo and board you want to sync, then run

```bash
datafire serve --tasks
```

## Private Repos
To use a private repository, link your GitHub account:
```
datafire authenticate github --alias github
```

You can generate an access token at [github.com/settings/tokens](https://github.com/settings/tokens)
