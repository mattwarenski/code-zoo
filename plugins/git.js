const childProcess = require("child_process");
const inquirer = require('inquirer');
const util = require('../util.js')

//async function branchExists(branchName)
//{
  //await runGitCommand("for-each-ref --format='%(refname)' 'refs/heads/*'", config, true)
    //.split("\n")
    //.
//}

function runGitCommand(command, config, noLog){
  return new Promise((resolve, reject) => {
    util.logStep(`:git ${command}`);
    const props = {"cwd" : config.projectDir, "encoding" : 'utf-8'};
    childProcess.exec(`git ${command}`, props, (error, stdout, stderr) => {
      if(error){
        reject(error);
      } else {
        if(!noLog)
          util.logStep("stdout", stdout);  
        resolve(stdout ? stdout : " ");
      }
    })
  })
}

function getStashKey(branch, carry){
  return `cz-stash-${branch}${carry ? "-carry" : ""}`;
}

async function handleUnstash(branchName, config){
  const branchStash = await runGitCommand("--no-pager stash list", config, true)
                     .split('\n')
                     .filter(p => p)
                     .map(p => p.split(":"))
                     .find(a => a[2].trim() === getStashKey(branchName))

  if(branchStash){
    const indexMatch = branchStash[0].match(/stash@\{([\d+])\}/);
    util.logStep("Popping previous branch changes")
    await runGitCommand(`stash pop --index ${indexMatch[1]}`, config) 
  }

}

async function handleStash(branchName, config){
    const hasChanges = await runGitCommand("status --porcelain", config, true)
    if(hasChanges){
      await runGitCommand("status", config);
      const response = await inquirer.prompt([
        {
          name : 'answer', 
          type : 'list', 
          choices : ['Carry', 'Stash', 'Abort'],
          message : 'Branch has changes. What do you want to do?'
        } 
      ]);

      if(response.answer === 'Carry'){
        await runGitCommand(`stash push -u -m '${getStashKey(branchName, true)}'`, config);  
      } else if(response.answer === 'Stash'){
        await runGitCommand(`stash push -u -m '${getStashKey(branchName)}'`, config);  
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

  "onEdit" : async function(levelName, config, previousLevel){
    await runGitCommand(`branch -m ${previousLevel} ${levelName}`, config)
  },

  "onNew" :async function(levelName, config, previousLevel){
    if(config.parentBranch){
      util.logStep("Branching from parent branch " + config.parentBranch)
      const stashAnswer = await handleStash(previousLevel, config); 

      if(stashAnswer === "Abort"){
        return; 
      }

      await runGitCommand(`checkout ${config.parentBranch}`, config)
      try{
        await runGitCommand(`pull`, config)
      } catch(e){
        util.logStep(`Unable to pull branch ${config.parentBranch}`, e) 
      }

    }
    await runGitCommand(`checkout -b ${levelName}`, config)
  },

  "onArchive" : async function(levelName, config){
    console.log("archive levelName", levelName, config) 
    //TODO: prompt remove branch 
  },

  "onSwitch" : async function(levelName, config, previousLevel){
    const stashAnswer = await handleStash(previousLevel, config);

    if(stashAnswer === "Abort"){
      return; 
    }

    util.logStep("switching to branch " + levelName); 
    await runGitCommand(`checkout ${levelName}`, config)

    if(stashAnswer === "Carry"){
      await runGitCommand(`stash pop`, config) 
    }

    await handleUnstash(levelName, config);

  }

}