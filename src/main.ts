import express from 'express';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as os from 'os';

const app = express();
const port = process.env.PORT || 8080;
const OUTDIR = path.join(os.homedir(), 'mlg-editor-data');

function ensureOutdirExists() {
  if (!fs.existsSync(OUTDIR)) {
    fs.mkdirSync(OUTDIR);
  }
}

function execSync(cmd: string): string {
  return cp.execSync(cmd, { cwd: OUTDIR }).toString();
}

app.use(express.static(path.join('webapp', 'build')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors());

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'webapp', 'build', 'index.html'));
});

app.post('/api/write', (req, res) => {
  const data: {
    filename: string;
    text: string;
  } = req.body;
  if (data.filename) {
    const outPath = path.join(OUTDIR, data.filename);
    console.log('Writing:', outPath);
    console.log('Content:', data.text);
    try {
      ensureOutdirExists();
      fs.writeFileSync(outPath, data.text);
      const diff = execSync('git diff');
      if (diff.length > 0) {
        execSync(`git add ${data.filename}`);
        execSync(`git commit -m 'write at ${new Date()}\n\n${diff}'`);
      }
      res.send({
        error: null,
      });
    } catch (err) {
      res.send({
        error: err.message,
      });
    }
  } else {
    res.sendStatus(500);
  }
});

app.post('/api/read', (req, res) => {
  const data: {
    filename: string;
  } = req.body;
  if (data.filename) {
    const outPath = path.join(OUTDIR, data.filename);
    console.log('Reading:', outPath);
    try {
      res.send({
        text: fs.readFileSync(outPath, 'utf8'),
        error: null,
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        ensureOutdirExists();
        fs.writeFileSync(outPath, '');
        res.send({
          text: '',
          error: null,
        });
      } else {
        res.send({
          text: '',
          error: err.message
        });
      }
    }
  } else {
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  ensureOutdirExists();
  execSync('git init');
  execSync('git branch -m main');
  console.log(`Listening on port ${port}`);
});
