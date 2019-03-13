const public = {};
const fs = require('fs');
const inquirer = require('inquirer');
const { spawn } = require('child_process');
const util = require('../util.js')

//TODO: use home env 
const DEFAULT_CONFIG_FILE = "/home/mathew/.codezoo.json"
const TEMP_FILE = "/tmp/codezooedit.json"
const EDITABLE_CONFIG_KEYS = ["archived", "name", "plugins"];

let configFile = DEFAULT_CONFIG_FILE;
let config;

const EDITOR = process.env.EDITOR || 'vi';


  
function rageQuit(reason){
  util.logPhase(reason, true)
  process.exit(1);
}


function filterObj(obj, allowed, invert)
{
  return Object.keys(obj)
    .filter(key => invert ? !allowed.includes(key) : allowed.includes(key))
    .reduce((newObj, key) => {
        newObj[key] = obj[key];
        return newObj;
        }, {});
}

function validateEditorResponse(response, classParent, currentName)
{
  if(!response.name){
    throw new Error("`name` is required") 
  }
  
  if(classParent.children.find(child => child.name === response.name && child.name !== currentName)){
    throw new Error(`'name' ${response.name} already exists`)  
  }
}

function getFromEditor(obj, classParent, currentName)
{
  const editableObj = filterObj(obj, EDITABLE_CONFIG_KEYS);
  const nonEditableObj = filterObj(obj, EDITABLE_CONFIG_KEYS, true);

  function runEditor(resolve)
  {
    const child = spawn(EDITOR, [TEMP_FILE], { stdio: 'inherit' });

    child.on('exit', function (e, code) {
      try{
      const result = fs.readFileSync(TEMP_FILE, 'utf-8')
      const inputJSON = JSON.parse(result);
      validateEditorResponse(inputJSON, classParent, currentName)
      const finalObj = Object.assign(nonEditableObj, inputJSON);
      //console.log("done editing got:", finalObj)
      resolve(finalObj)
      } catch(e){
          promptRetryAfterError(e)
          .then(ans => {
            if(ans.answer){
              runEditor(resolve); 
            }  else {
              rageQuit("Error processing input JSON") 
            }
          })
      }
    });
  }
  
  return new Promise(resolve => {
    fs.writeFileSync(TEMP_FILE, JSON.stringify(editableObj, undefined, 2));
    runEditor(resolve);
  });
}

function getCurrentChain(){
  const currentChain = [config];
  let currentLevel = config;
  while(currentLevel && currentLevel.currentChild){
    currentLevel = currentLevel.children.find(child => currentLevel.currentChild === child.name)
    if(currentLevel){
      currentChain.push(currentLevel);
    }
  }

  return currentChain;
}

function findClassParent(className){
  let currentLevel = config;
  let parent;
  while(currentLevel.currentChild && currentLevel['class'] !== className){
    parent = currentLevel;
    currentLevel = currentLevel.children.find(child => currentLevel.currentChild === child.name)
    if(!currentLevel){
      return null;
    }
  }

  if(currentLevel['class'] === className){
    return parent;
  } else {
    return null;  
  }
}


function createInstanceTemplate(){
  return {
    class : "", 
    name : "", 
    currentChild : "", 
    archived : false,
    plugins : {}, 
    children : [], 
  }
}

function promptConfirmation(message){
  return inquirer.prompt([
    {
      name : 'answer',
      type : 'confirm',
      message
    } 
  ])
}

function promptRetryAfterError(error){
  return inquirer.prompt([
    {
      name : 'answer',
      type : 'confirm',
      message : `Error occurred while parsing input: \n${error} \n\n Retry [yN]`
    } 
  ])
}

function promptCreateConfig(file){
  return inquirer.prompt([
    {
      name : 'answer',
      type : 'confirm',
      message : `${file} does not exist. Create it [yN]`
    } 
  ])
}

function prompParentClass(currentChain){
  const options = currentChain.map(instance => instance['class']);
  return inquirer.prompt([
    {
      name : 'parentClass',
      type : 'list',
      choices : options, 
      message : `Select parent class`
    } 
  ]).then(res => {
    //console.log('got res', res) 
    return currentChain.find(level => level['class'] === res.parentClass)
  });
}

async function promptSibling(classParent, className, filterCurrent, showArchived){
  //console.log("cp", classParent)
  const siblings = classParent.children
                              .filter(child => child['class'] === className)
                              .filter(child => !filterCurrent || child.name != classParent.currentChild)
                              .filter(child => showArchived ? true : !child.archived)

  if(!siblings.length){
    rageQuit(`${className} has no other instances to switch to`) 
  }


  return inquirer.prompt([
    {
      name : 'name',
      type : 'list',
      choices : siblings, 
      message : `Select instance to switch to`
    } 
  ]).then(res => {
    //console.log('got res', res) 
    return classParent.children.find(child => child.name === res.name)
  });
}


public.load = async function(){
  if(!fs.existsSync(configFile)){
    const res = await promptCreateConfig(configFile);
    if(res.answer){
      const global = createInstanceTemplate();
      global['class'] = "_global";
      fs.writeFileSync(configFile, JSON.stringify(global)); 
    } else {
      rageQuit("Must have config to run");
    }
  } 

  config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  return config
}


async function save(){
  fs.writeFileSync(configFile, JSON.stringify(config)); 
}

public.createNew = async className => {
  if(className === '_global'){
    rageQuit("class name '_global' is reserved") 
  }
  
  
  const currentChain = getCurrentChain();
  const classParent = findClassParent(className) || await prompParentClass(currentChain);

  const currentInstance = classParent.children.find(instance => instance.name === classParent.currentChild);

  //console.log('found class parent', classParent)
  const newTemplate = currentInstance ? Object.assign({}, currentInstance) : createInstanceTemplate();

  const newInstance =  await getFromEditor(newTemplate, classParent);
  newInstance['class'] = className;

  classParent.currentChild = newInstance.name;
  classParent.children.push(newInstance);

  await runPlugins(newInstance, "onNew", currentInstance); 

  save();
}

public.switch = async className => {

  const parentClass = findClassParent(className);
  if(!parentClass)
    rageQuit(`Unable to find parent for class '${className}'`)
  const currentInstance = parentClass.children.find(c => c.name === parentClass.currentChild)
  const newInstance = await promptSibling(parentClass, className, true);

  util.logPhase(`Switching to ${className} ${newInstance.name}`)

  parentClass.currentChild = newInstance.name;

  await runPlugins(newInstance, "onSwitch", currentInstance); 

  save();
}

public.showLevelChain = className => {
  const currentChain = getCurrentChain();
  currentChain.forEach(level => console.log(`${level['class']} - ${level.currentChild}`))
}

public.show = className => {
  const parentClass = findClassParent(className);
  parentClass.children.forEach(child => console.log(`${child.name}${child.archived ? " (archived)" : ""}`))
}

public.archive = async className => {
  const parentClass = findClassParent(className);
  const toArchive = await promptSibling(parentClass, className);

  //console.log("archiving ", toArchive)

  toArchive.archived = true;
  //TODO handle case where a current child is archived

  //console.log(config)
  await runPlugins(toArchive, "onArchive"); 

  save();
}

public.edit = async className => {

  const classParent = findClassParent(className);
  if(!classParent)
    rageQuit(`Unable to find parent for class '${className}'`)
  const toEdit = await promptSibling(classParent, className);
  const editedCopy =  await getFromEditor(toEdit, classParent, toEdit.name);
  
  classParent.children.splice(classParent.children.indexOf(toEdit.name), 1, editedCopy);

  if(classParent.currentChild === toEdit.name){
    classParent.currentChild = editedCopy.name; 
  }

  await runPlugins(editedCopy, "onEdit", toEdit); 

  save();
}

async function runPlugins(currentLevel, hookName, previousLevel)
{
  for(pluginName in currentLevel.plugins){
    if(currentLevel.plugins.hasOwnProperty(pluginName)){
      //console.log("searching for plugin", pluginName, "hookname", hookName)
      try{
        var plugin = require("../plugins/" + pluginName + ".js") 
        if(plugin && plugin[hookName]){
          //console.log("Found plugin: running hook", hookName)
          util.logPhase(`Running plugin ${pluginName}`)
          const promise = plugin[hookName](currentLevel.name, currentLevel.plugins[pluginName], previousLevel.name);
          if(promise){
            await promise; 
          }
        }
      } catch (e){
        util.logPhase(`Error Occurred while running ${pluginName}'`, e)
        const response = await promptConfirmation("Would you like to continue");
        if(!response.answer){
          rageQuit("Aborting")
        }        
      }
    } 
  }
}



public.setConfigFile = file => configFile = file;

module.exports = public;
