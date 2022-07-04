import express from 'express';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';

const app = express();
const port = process.env.PORT || 8080;
const OUTDIR = 'out';

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
  console.log('write: data=', data);
  if (data.filename) {
    try {
      fs.writeFileSync(path.join(OUTDIR, data.filename), data.text);
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
  console.log('in /api/read');
  const data: {
    filename: string;
  } = req.body;
  if (data.filename) {
    try {
      res.send({
        text: fs.readFileSync(path.join(OUTDIR, data.filename), 'utf8'),
        error: null,
      });
    } catch (err) {
      console.log('err=', err);
      if (err.code === 'ENOENT') {
        fs.writeFileSync(path.join(OUTDIR, data.filename), '');
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
  console.log(`Listening on port ${port}`);
});
