# Sync GitHub Issues to Trello

You'll need to authorize Trello by running
```
datafire authenticate trello
```

You can find your `key` here:
https://trello.com/app-key

You can generate a `token` by clicking the link to "Token" on the page above, or by adding your `key` to this URL:

https://trello.com/1/authorize?expiration=never&scope=read,write,account&response_type=token&name=Server%20Token&key=


Once you're done authorizing, you can run:
```
datafire run flow.js -p.owner torvalds -p.repo linux -p.board "Linux Issues"
```

replacing `p.repo`, `p.owner`, and `p.board` with the repository and
Trello board you want to sync.
