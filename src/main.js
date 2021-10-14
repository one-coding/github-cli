// @ts-check

// Github의 레포지토리 관리 CLI를 만들어본다.
// 이슈, 풀 리퀘스트 등의 라벨 관리

/*

node src/main.js <parameter>

git add <filename>

*/
require('dotenv').config()

const { GITHUB_ACCESS_TOKEN } = process.env

const { program } = require('commander')
const { Octokit } = require('octokit')

const octokit = new Octokit({ auth: GITHUB_ACCESS_TOKEN })

program.version('0.0.1')

program
  .command('me')
  .description('Check my Profile')
  .action(async () => {
    const {
      data: { login },
    } = await octokit.rest.users.getAuthenticated()
    console.log('Hello %s', login)
  })

program
  .command('list-bugs')
  .description('List issues with bug label')
  .action(async () => {
    const result = await octokit.rest.issues.listForRepo({
      owner: 'one-coding',
      repo: 'github-cli',
      labels: 'bug',
    })

    const output = result.data.map((issue) => ({
      title: issue.title,
      number: issue.number,
    }))

    console.log('output😀 : ', output)

    /* 이렇게도 할  수 있다~
    const issueWithBugLabel = result.data.filter(
      (issue) =>
        issue.labels.find((label) => label.name === 'bug') !== undefined
    )

    const output = issueWithBugLabel.map((issue) => ({
      title: issue.title,
      number: issue.number,
    }))
    console.log('output 😀:', output)
    */
  })

// 풀 리퀘스트를 모두 검사해서,
// 만약 너무 diff가 큰(100줄) 풀 리퀘스트가 있으면 'too-big'이라는 레이블을 붙인다.

program
  .command('check-prs')
  .description('Check pull request status')
  .action(async () => {
    console.log('Check PRs!')
  })

program.parseAsync()
