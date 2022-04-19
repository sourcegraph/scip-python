# Development

## TJ's Workflow

(This is just a rough draft, but if anyone else wants to run, you can basically do this as well)


Get the project building (leave this running)

```
# In one terminal
$ npm run watch
```

Then, you can just run stuff with the index manually

```
$ node ./index $ARGS
```

OR

```
$ nodemon --watch ./dist/lsif-pyright.js --exec '...'
```

This way you can run every time you update the project. For some reason jest is
*painfully* slow. I literally cannot run jest tests. Instead I run the snapshots
with `nodemon` and then check the diffs afterwards
