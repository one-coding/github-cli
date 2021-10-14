// @ts-check

// Github의 레포지토리 관리 CLI를 만들어본다.
// 이슈, 풀 리퀘스트 등의 라벨 관리

/*

node src/main.js <parameter>

git add <filename>

*/

const { program } = require('commander')
const fs = require('fs')

program.version('0.0.1')

program
  .command('list-bugs')
  .description('List issues with bug label')
  .action(async () => {
    console.log('before readFile...')
    const result = await fs.promises.readFile('.prettierrc', 'utf-8')
    console.log('readFile result:', result)
    console.log('List bugs!')
  })

program
  .command('check-prs')
  .description('Check pull request status')
  .action(async () => {
    console.log('Check PRs!')
  })

program.parseAsync()
