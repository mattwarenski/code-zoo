const chalk = require('chalk');
const inquirer = require('inquirer');

const public = {};

function indent(level, text){
  if(!text)
    return ""

  return text.toString().split("\n")
      .map(line => "  ".repeat(level) + line)
      .join("\n") + "\n"
}

public.logPhase = function(msg, error){
  if(error){
    console.log(chalk.red.bold(indent(1, msg)))
    if(error instanceof Error){
      //console.log(chalk.red(indent(1, error))) 
      console.log(chalk.red(indent(1, error.stack))) 
    }
  } else {
    console.log(chalk.green(indent(1, msg)))
  }
}

public.logStep = function(msg, error){
  if(error){
    console.log(chalk.red.bold(indent(2, msg)))
    if(error instanceof Error){
      //console.log(chalk.red(indent(2, error))) 
      console.log(chalk.red(indent(2, error.stack))) 
    }
  } else {
    console.log(chalk.blue(indent(2, msg)))
  }
}

public.confirmation = async function(message){

  return inquirer.prompt([
    {
      name : 'answer',
      type : 'confirm',
      message
    } 
  ])
}


module.exports = public;
