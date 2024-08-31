const express = require('express');
const db = require('./api/database/mysql');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const util = require('util');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { writeFileSync } = require('fs');
const path = require('path');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/storage', express.static('app/storage'));

const query = util.promisify(db.query).bind(db);

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const fileManager = new GoogleAIFileManager(process.env.API_KEY);

app.post('/upload', async (req, res) => {
  if (
    Buffer.from(req.body.image, 'base64').toString('base64') !==
      req.body.image ||
    !dayjs(req.body.measure_datetime).isValid() ||
    typeof req.body.customer_code !== 'string' ||
    !['GAS', 'WATER'].includes(req.body.measure_type)
  )
    res.status(400).send({
      error_code: 'INVALID_DATA',
      error_description:
        'Os dados fornecidos no corpo da requisição são inválidos',
    });

  const measure = await query(
    `SELECT measure_uuid FROM measures WHERE customer_code = '${req.body.customer_code}' AND measure_type = '${req.body.measure_type}' AND DATE_FORMAT(measure_datetime, "%m %Y") = DATE_FORMAT('${req.body.measure_datetime}', "%m %Y")`,
  );

  if (measure.length < 1)
    res.status(409).send({
      error_code: 'DOUBLE_REPORT',
      error_description: 'Leitura do mês já realizada',
    });

  const image = Buffer.from(req.body.image, 'base64');
  writeFileSync(path.resolve(__dirname, 'storage', 'image.png'), image);

  const uploadResponse = await fileManager.uploadFile(
    path.resolve(__dirname, 'storage', 'image.png'),
    { mimeType: 'image/png', displayName: 'Measure' },
  );

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
  });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: uploadResponse.file.mimeType,
        fileUri: uploadResponse.file.uri,
      },
    },
    {
      text: 'Essa é uma foto de um medidor de aguá/gas preciso dos numeros da medição. Me retorne SEMPRE apenas os numeros da medição.',
    },
  ]);

  const response = {
    image_url: 'http://localhost:3000/storage/image.png',
    measure_value: result.response.text(),
    measure_uuid: uuidv4(),
  };

  res.send(response);
});

app.patch('/confirm', async (req, res) => {
  if (
    typeof req.body.measure_uuid !== 'string' ||
    typeof req.body.confirmed_value !== 'boolean'
  )
    res.status(400).send({
      error_code: 'INVALID_DATA',
      error_description:
        'Os dados fornecidos no corpo da requisição são inválidos',
    });

  const measure = await query(
    `SELECT has_confirmed FROM measures WHERE measure_uuid = '${req.body.measure_uuid}'`,
  );

  if (measure.length < 1)
    res.status(404).send({
      error_code: 'MEASURE_NOT_FOUND',
      error_description: 'Leitura do mês já realizada',
    });

  if (measure[0].has_confirmed === true)
    res.status(409).send({
      error_code: 'CONFIRMATION_DUPLICATE',
      error_description: 'Leitura do mês já realizada',
    });

  await query(
    `UPDATE measures SET has_confirmed = ${req.body.confirmed_value} WHERE measure_uuid = '${req.body.measure_uuid}'`,
  );

  res.send({ success: true });
});

app.get('/:customer_code/list', async (req, res) => {
  let where = '';
  if (req.query.measure_type) {
    if (!['GAS', 'WATER'].includes(req.query.measure_type))
      res.status(400).send({
        error_code: 'INVALID_TYPE',
        error_description: 'Tipo de medição não permitido',
      });
    where = `AND measure_type = '${req.query.measure_type}'`;
  }

  const list = await query(
    `SELECT measure_uuid, measure_datetime, measure_type, has_confirmed, image_url FROM measures WHERE customer_code = '${req.params.customer_code}' ${where}`,
  );

  if (list.length < 1)
    res.status(404).send({
      error_code: 'MEASURES_NOT_FOUND',
      error_description: 'Nenhuma leitura encontrada',
    });

  res.send({ customer_code: req.params.customer_code, measures: list });
});

app.listen(3000);
