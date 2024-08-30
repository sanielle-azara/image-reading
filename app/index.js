const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');

const app = express();

// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

//

app.post('/upload', (req, res) => {
  //
});

app.patch('/confirm', (req, res) => {
  //
});

app.get('/:code/list', (req, res) => {
  res.send(req.params.code);
});

app.listen(3000);
