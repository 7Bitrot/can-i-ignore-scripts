# can-i-ignore-scripts

A cli to analyze your dependencies and check what could break when you switch from `npm ci` to `npm ci --ignore-scripts`

Read more in [this blog post](https://dev.to/naugtur/get-safe-and-remain-productive-with-can-i-ignore-scripts-2ddc)

Use [@lavamoat/allow-scripts](https://www.npmjs.com/package/@lavamoat/allow-scripts) to manage your lifecycle allowlist and not get tricked into running malicious scripts.

## Usage

Go to the folder containing your installed node_modules and run `can-i-ignore-scripts` either by installing it first or via npx `npx can-i-ignore-scripts`

```
naugtur@localtoast:~/repo/ [main]$ can-i-ignore-scripts 

█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
  ▄▄·  ▄▄▄·  ▐ ▄    ▄     ▪    ▄▄     ▐ ▄       ▄▄▄   ▄▄▄     ·▄▄▄▄•
 ▐█ ▌▪▐█ ▀█ •█▌▐█   ██    ██  ▐█ ▀    █▌▐█      ▐▄ █· █  ▀·  .▀· .█▌
 ██ ▄▄▄█▀▀█ ▐█▐▐▌   ▐█·   ▐█· ▄█ ▀█▄ ▐█▐▐▌ ▄█▀▄ ▐▀▀▄ ▐█▀      ▄█▀▀▀•
 ▐███▌▐█ ▪▐▌██▐█▌   ▐█▌   ▐█▌ ▐█▄ ▐█ ██▐█▌▐█▌.▐▌▐▄ █▌▐█▄▄▄▌   ▀
 ·▀▀▀  ▀  ▀ ▀▀ █▪   ▀▀▀   ▀▀▀ ·▀▀▀▀  ▀▀ █▪ ▀█▄▀▪.▀  ▀ ▀▀▀     ▀

▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
Found following packages with scripts:
[ ignore ] 'monorepo-symlink-test' has scripts but they can be ignored 
             reason: false positive
[ ignore ] 'ejs' has scripts but they can be ignored 
             reason: funding
[ ignore ] 'core-js' has scripts but they can be ignored 
             reason: funding

```

## Security

It's recommended that you turn off install scripts in general. When you can't - you need to only run the ones that you actually need. Figuring that out via trial and error can be frustrating, that's why this tool exists to point out which packages are known to rely on their scripts and which are fine to ignore. 

> The advice provided by this tool is only to help figure out which scripts should make the short list. This package does not improve security in any way. It makes your actions to improve your security less tedious. None of the information provided is stating that scripts are safe to run. It only exists as a collection of information which scripts will break things if denied. It's on you to decide if they're safe, and for that you can look them up via socket.dev


## Contributing

I'm in the process of figuring out how to populate `data.json`. I crawled npm starting at the 1000 most popular packages from 2019 and all their dependencies.

You're welcome to report your recommendations what to ignore or keep as pull requests to `data.json`. 

The file also contains a `todo` section with the packages I found but didn't review yet. I'll appreciate PRs with work on that too. 
