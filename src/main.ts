import express from 'express';
import * as path from 'path';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join('webapp', 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'webapp', 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
