// This script executed via github actions
import utf8 from "utf8";
import fs from "node:fs";
import github from "@actions/github";

const root_path = "/home/runner/work/library-svelte/library-svelte/static/json";
const repos = [
  ["Oddant1", "qiime2", "test"],
  ["Oddant1", "q2cli", "test"],
  ["Oddant1", "q2-types", "test"],
  ["Oddant1", "q2-cookiecutter", "test"]
];
const overview = {};
const octokit = github.getOctokit(process.argv[2]);

// Make sure we start from a clean slate
if (fs.existsSync(root_path)) {
  fs.rmSync(root_path, { recursive: true, force: true });
}
fs.mkdirSync(root_path);

for (const repo of repos) {
  const owner = repo[0];
  const repo_name = repo[1];
  const branch = repo[2];

  let repo_info = {};
  let repo_overview = {
    "Repo Owner": owner,
    "Repo Name": repo_name,
  };

  // Get the latest commit
  const commits = await octokit.request(
    `GET /repos/${owner}/${repo_name}/commits`,
    {
      owner: owner,
      repo: repo_name,
      ref: branch,
      per_page: 1,
      headers: {
        "X-Github-Api-Version": "2022-11-28",
      },
    },
  );

  const sha = commits["data"][0]["sha"];
  const runs = await octokit.request(
    `GET /repos/${owner}/${repo_name}/commits/${sha}/check-runs`,
    {
      owner: owner,
      repo: repo_name,
      ref: `${sha}`,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  repo_info["Commit Runs"] = runs;

  repo_overview["Commit Status"] = "passed";
  for (const run of runs["data"]["check_runs"]) {
    if (run["status"] !== "completed") {
      repo_overview["Commit Status"] = "in progress";
      break;
    }

    if (run["conclusion"] === "failure") {
      repo_overview["Commit Status"] = "failed";
      break;
    }
  }

  // Get the date, can be done via author or committer
  const commit_date = commits["data"][0]["commit"]["committer"]["date"];
  repo_overview["Commit Date"] = commit_date;

  // Get general repo data
  const repo_data = await octokit.request(`GET /repos/${owner}/${repo_name}`, {
    owner: owner,
    repo: repo_name,
    ref: branch,
    headers: {
      "X-Github-Api-Version": "2022-11-28",
    },
  });

  // Pull stars off that
  const stars = repo_data["data"]["stargazers_count"];
  repo_overview["Stars"] = stars;

  // Get the readme
  const readme = await octokit.request(
    `GET /repos/${owner}/${repo_name}/readme`,
    {
      owner: owner,
      repo: repo_name,
      ref: branch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  // Convert it back to a normal string
  const contents = utf8.decode(atob(readme["data"]["content"]));
  repo_info["Readme"] = contents;

  const envs = await octokit.request(
    `GET /repos/${owner}/${repo_name}/contents/${repo_name.replace('-', '_')}/environments/`,
    {
      owner: owner,
      repo: repo_name,
      ref: branch,
      path: `/${repo_name.replace('-', '_')}/environments/`,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  repo_overview['Distros'] = new Set();
  repo_overview['OSes'] = new Set();
  repo_overview['Epochs'] = new Set();

  console.log("ENVS")
  console.log(envs)
  for (const env of envs['data']) {
    console.log("ENV")
    console.log(env)
    // Strip the extension off the end of the name
    console.log("NAME")
    const name = env['name'].substring(0, env['name'].indexOf('.yml'));
    console.log(name)
    const split = name.split('-');
    console.log(split)

    repo_overview['Distros'].add(split[1]);
    repo_overview['OSes'].add(split[2]);
    repo_overview['Epochs'].add(split[3]);
  }

  repo_info = {...repo_info, ...repo_overview};

  if (!fs.existsSync(`${root_path}/${owner}`)) {
    fs.mkdirSync(`${root_path}/${owner}`);
  }
  fs.writeFileSync(
    `${root_path}/${owner}/${repo_name}.json`,
    JSON.stringify(repo_info),
  );

  overview[repo_name] = repo_overview;
}

overview["Date Fetched"] = new Date();
fs.writeFileSync(`${root_path}/overview.json`, JSON.stringify(overview));
