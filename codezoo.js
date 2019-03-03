#!/usr/bin/node

const config = require('./util/config-parser.js')
const yargs = require('yargs')

config.load().then(()=>{
    yargs.command({
      command: 'new <class>',
      aliases: ['new', 'create'],
      desc: 'new description',
      builder: (yargs) => yargs
        .option('c', {
          alias: 'child',
          desc: 'create child',
          boolean : true
      }),
      handler: (argv) => {
        console.log('running new argv:', argv)
        config.createNew(argv['class'])
      }
    })
    .command({
      command: 'switch <class> [name]',
      aliases: ['s', 'cd'],
      builder: (yargs) => yargs
        .option('a', {
          alias: ['all','archived'],
          desc: 'Include archived',
          boolean : true
      }),
      desc: 'switch description',
      handler: (argv) => {
        console.log('running switch argv:', argv)
        config.switch(argv['class'])
      }
    })
    .command({
      command: 'archive <class> [name]',
      aliases: ['d', 'rm'],
      desc: 'archive description',
      handler: (argv) => {
        config.archive(argv['class'])
      }
    })
    .command({
      command: 'delete <class> [name]',
      aliases: ['d', 'rm'],
      desc: 'delete description',
      handler: (argv) => {
        console.log('running delete argv:', argv)
      }
    })
    .command({
      command: 'edit <class> [name]',
      aliases: ['e'],
      desc: 'edit description',
      handler: (argv) => {
        config.edit(argv['class'])
      }
    })
    .command({
      command: 'show-tree',
      desc: 'showtree description',
      handler: (argv) => {
        config.showLevelChain()
      }
    })
    .command({
      command: 'show <class>',
      desc: 'show description',
      handler: (argv) => {
        config.show(argv['class'])
      }
    })
    .demandCommand()
    .help()
    .argv

});


