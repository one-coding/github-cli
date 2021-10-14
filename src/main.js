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
const chalk = require('chalk')
const prompts = require('prompts')
const marked = require('marked')

const octokit = new Octokit({ auth: GITHUB_ACCESS_TOKEN })

const OWNER = 'one-coding'
const REPO = 'github-cli'
const LABEL_TOO_BIG = 'too-big'
const LABLE_BUG = 'bug'
const LABLE_NEEDS_SCREENSHOT = 'needs-screenshot'

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

/**
 *
 * @param {Array<*>} labels
 * @param {string} labelName
 * @returns {boolean}
 */
function hasLabel(labels, labelName) {
  return labels.find((label) => label.name === labelName) !== undefined
}

program
  .command('list-bugs')
  .description('List issues with bug label')
  .action(async () => {
    const result = await octokit.rest.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      labels: 'bug',
    })

    const output = result.data.map((issue) => ({
      title: issue.title,
      number: issue.number,
    }))

    console.log('output😀 : ', output)

    /* 이렇게도 할  수 있다~
    const issueWithBugLabel = result.data.filter(
      (issue) => hasLabel(issue.labels, LABLE_BUG)
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
    const result = await octokit.rest.pulls.list({
      owner: OWNER,
      repo: REPO,
    })

    const prsWithDiff = await Promise.all(
      result.data.map(async (pr) => ({
        labels: pr.labels,
        number: pr.number,
        compare: await octokit.rest.repos.compareCommits({
          owner: OWNER,
          repo: REPO,
          base: pr.base.ref,
          head: pr.head.ref,
        }),
      }))
    )

    Promise.all(
      prsWithDiff
        .map(({ compare, ...rest }) => {
          const totalChanges = compare.data.files?.reduce(
            (sum, file) => sum + file.changes,
            0
          )
          return {
            ...rest,
            compare,
            totalChanges,
          }
        })
        .filter(
          (pr) =>
            pr && typeof pr.totalChanges === 'number' && pr.totalChanges > 100
        )
        .map(async ({ labels, number, totalChanges }) => {
          console.log(
            chalk.greenBright.bgWhite.bold(
              'PR',
              number,
              'totalChanges:',
              totalChanges
            )
          )
          if (hasLabel(labels, LABEL_TOO_BIG)) {
            console.log(
              chalk.greenBright(`Adding ${LABEL_TOO_BIG} PR ${number}....`)
            )

            const response = await prompts({
              type: 'confirm',
              name: 'shouldContinue',
              message: `Do you really want to add label ${LABEL_TOO_BIG} to PR ${number}`,
            })

            if (response.shouldContinue) {
              return octokit.rest.issues.addLabels({
                owner: OWNER,
                repo: REPO,
                issue_number: number,
                labels: [LABEL_TOO_BIG],
              })
            }
            console.log('Cancelled!')
          }

          return undefined
        })
    )

    console.log()
  })

/**
 *
 * @param {string} md
 * @returns {boolean}
 */
function isAnyScreenshotInMarkdownDocument(md) {
  const tokens = marked.lexer(md)

  let didFind = false
  marked.walkTokens(tokens, (token) => {
    if (token.type === 'image') {
      didFind = true
      console.log('Found image!')
    }
  })
  return didFind
  //   console.log(JSON.stringify(tokens, null, 2))
}

// bug 레이블이 달려 있으나, 스크린 샷이 없는 이슈에 대해서
// needs-screenshot 이라는 레이블 달아주기
program
  .command('check-screenshots')
  .description(
    'Check if any issue is missing screenshot even if it has bug label on it'
  )
  .action(async () => {
    const result = await octokit.rest.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      labels: 'bug',
    })

    const issueWithBugLabel = result.data
    // 1. bug 레이블이 있고, 스크린샷은 없음 => + needs-screenshot
    const issueWithoutScreenshot = issueWithBugLabel.filter(
      (issue) =>
        (!issue.body || !isAnyScreenshotInMarkdownDocument(issue.body)) &&
        !hasLabel(issue.labels, LABLE_NEEDS_SCREENSHOT)
    )

    await Promise.all(
      issueWithoutScreenshot.map(async (issue) => {
        const shouldContinue = await prompts({
          type: 'confirm',
          name: 'shouldContinue',
          message: `Add ${LABLE_NEEDS_SCREENSHOT} to issue #${issue.number}?`,
        })

        if (shouldContinue) {
          await octokit.rest.issues.addLabels({
            owner: OWNER,
            repo: REPO,
            issue_number: issue.number,
            labels: [LABLE_NEEDS_SCREENSHOT],
          })
        }
      })
    )
    // 2. bug 레이블이 있고, needs-screenshot이 있는데, 스크린 샷 있음 => - needs-screenshot
    const issueResolved = issueWithBugLabel.filter(
      (issue) =>
        issue.body &&
        isAnyScreenshotInMarkdownDocument(issue.body) &&
        hasLabel(issue.labels, LABLE_NEEDS_SCREENSHOT)
    )

    await Promise.all(
      issueResolved.map(async (issue) => {
        const shouldContinue = await prompts({
          type: 'confirm',
          name: 'shouldContinue',
          message: `Remove ${LABLE_NEEDS_SCREENSHOT} to issue #${issue.number}?`,
        })
        if (shouldContinue) {
          await octokit.rest.issues.removeLabel({
            owner: OWNER,
            repo: REPO,
            issue_number: issue.number,
            name: LABLE_NEEDS_SCREENSHOT,
          })
        }
      })
    )
  })

program.parseAsync()
