const childProcess = require("child_process");
const inquirer = require('inquirer');

function runGitCommand(command, config, noLog){
  console.log(`childProcess.execSync(git ${command}, {"cwd" : config.projectDir, stdio: [process.stdin, process.stdout, process.stderr]})`);
  const props = {"cwd" : config.projectDir, encoding : 'utf-8'};
  if(!noLog){
    props.stdio =  [process.stdin, process.stdout, process.stderr];
  }
  return childProcess.execSync(`git ${command}`, props)
}

function getStashKey(branch, carry){
  return `cz-stash-${branch}${carry ? "-carry" : ""}`;
}

function handleUnstash(branchName, config){
console.log("stashname ", getStashKey(branchName))
  const branchStash = runGitCommand("--no-pager stash list", config, true)
                     .split('\n')
                     .filter(p => p)
                     .map(p => p.split(":"))
                     .find(a => a[2].trim() === getStashKey(branchName))

  console.log('found', branchStash)
  if(branchStash){
    const indexMatch = branchStash[0].match(/stash@\{([\d+])\}/);
    console.log("Popping previous branch changes")
    runGitCommand(`stash pop --index ${indexMatch[1]}`, config) 
  }

}

async function handleStash(branchName, config){
    const hasChanges = runGitCommand("status --porcelain", config, true)
    console.log("has changes output", hasChanges)
    if(hasChanges){
      runGitCommand("status", config);
      const response = await inquirer.prompt([
        {
          name : 'answer', 
          type : 'list', 
          choices : ['Carry', 'Stash', 'Abort'],
          message : 'Branch has changes. What do you want to do?'
        } 
      ]);

      if(response.answer === 'Carry'){
        runGitCommand(`stash push -u -m '${getStashKey(branchName, true)}'`, config);  
      } else if(response.answer === 'Stash'){
        runGitCommand(`stash push -u -m '${getStashKey(branchName)}'`, config);  
      } 

      return response.answer; 
    } 

    return "nochanges";
}

module.exports =  {

  //"validate" : function(config){
    //if(!config.projectDir){
      //throw new Error("projectDir must be defined") 
    //} 

    ////todo validate that it is a git directory
  //},

  "onEdit" : function(levelName, config, previousLevel){
    runGitCommand(`branch -m ${previousLevel} ${levelName}`, config)
  },

  "onNew" : function(levelName, config, previousLevel){
    console.log("running new")
    if(config.parentBranch){
      console.log("Branching from parent branch", config.parentBranch)
      const stashAnswer = handleStash(previousLevel, config); 

      if(stashAnswer === "Abort"){
        return; 
      }

      runGitCommand(`checkout ${config.parentBranch}`, config)
      try{
        runGitCommand(`pull`, config)
      } catch(e){
        console.log(`Unable to pull branch ${config.parentBranch}`, e) 
      }

    }
    runGitCommand(`checkout -b ${levelName}`, config)
  },

  "onArchive" : function(levelName, config){
    console.log("archive levelName", levelName, config) 
    //TODO: prompt remove branch 
  },

  "onSwitch" : async function(levelName, config, previousLevel){
    const stashAnswer = await handleStash(previousLevel, config);

    if(stashAnswer === "Abort"){
      return; 
    }

    console.log("switching to branch", levelName) 
    runGitCommand(`checkout ${levelName}`, config)

    if(stashAnswer === "Carry"){
      runGitCommand(`stash pop`, config) 
    }

    handleUnstash(levelName, config);

  }

}
