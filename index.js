const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs').promises;

const app = express();
app.use(bodyParser.json());

const HTTP_OK_STATUS = 200;
const PORT = '3000';

// não remova esse endpoint, e para o avaliador funcionar
app.get('/', (_request, response) => {
  response.status(HTTP_OK_STATUS).send();
});

const getTalkers = async () => {
  const talkers = await fs.readFile('./talker.json', 'utf8');
  return JSON.parse(talkers);
};

const tokenValidation = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ message: 'Token não encontrado' });
  }
  if (authorization.length !== 16) {
    return res.status(401).json({ message: 'Token inválido' });
  }
  next();
};

const talkerNameValidation = async (req, res, next) => {
  const { name } = req.body;
  if (name === '' || name === undefined) {
    return res.status(400).json({ message: 'O campo "name" é obrigatório' });
  }
  if (name.length < 3) {
    return res.status(400).json({ message: 'O "name" deve ter pelo menos 3 caracteres' });
  }
  next();
};

const talkerAgeValidation = async (req, res, next) => {
  const { age } = req.body;
  if (age === '' || age === undefined) {
    return res.status(400).json({ message: 'O campo "age" é obrigatório' });
  }
  if (age < 18) {
    return res.status(400).json({ message: 'A pessoa palestrante deve ser maior de idade' });
  }
  next();
};

const talkerTalkValidation = async (req, res, next) => {
  const { talk } = req.body;
  if (talk === '' || talk === undefined) {
    return res.status(400).json({ message: 'O campo "talk" é obrigatório' });
  }
  next();
};

const talkerwatchedAtValidation = async (req, res, next) => {
  const { talk: { watchedAt } } = req.body;
  if (watchedAt === '' || watchedAt === undefined) {
    return res.status(400).json({ message: 'O campo "watchedAt" é obrigatório' });
  }
  const dateRegex = /^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)\d{4}$/;
  if (!dateRegex.test(watchedAt)) {
    return res.status(400)
    .json({ message: 'O campo "watchedAt" deve ter o formato "dd/mm/aaaa"' });
  }
  next();
};

const talkerRateValidation = async (req, res, next) => {
  const { talk: { rate } } = req.body;
  if (rate === '' || rate === undefined) {
    return res.status(400).json({ message: 'O campo "rate" é obrigatório' });
  }
  if (rate < 1 || rate > 5) {
    return res.status(400).json({ message: 'O campo "rate" deve ser um inteiro de 1 à 5' });
  }
  next();
};        

const emailValidation = async (req, res, next) => {
  const { email } = req.body;
  const emailRegex = RegExp(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
  if (email === '' || email === undefined) {
    return res.status(400).json({ message: 'O campo "email" é obrigatório' });
  } 
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'O "email" deve ter o formato "email@email.com"' });
  }
  next();
};

const passwordValidation = async (req, res, next) => {
  const { password } = req.body;
  if (password === '' || password === undefined) {
    return res.status(400).json({ message: 'O campo "password" é obrigatório' });
  }
  const p = password.length < 6;
  if (p) {
    return res.status(400).json({ message: 'O "password" deve ter pelo menos 6 caracteres' });
  }
  next();
};

// ## 8 - Crie o endpoint GET `/talker/search?q=searchTerm`

app.get('/talker/search',
tokenValidation,
async (req, res) => {
  const { q } = req.query;
  const talkers = await getTalkers();
  if (!q || q === '') {
    return res.status(200).json(talkers);
  }
  const talkersFiltered = talkers
  .filter((talker) => talker.name.toLowerCase().includes(q.toLowerCase()));
  res.status(200).json(talkersFiltered);
});

// REQ 1 -  Crie o endpoint GET /talker

app.get('/talker', async (_request, response) => {
  const talkers = await getTalkers();
  if (talkers.length === 0) {
    return response.status(200).send([]);
  }
  response.status(200).json(talkers);
});

// REQ 2 - Crie o endpoint GET /talker/:id

app.get('/talker/:id', async (request, response) => {
  const talkers = await getTalkers();
  const tk = talkers.find((talker) => talker.id === Number(request.params.id));
  if (!tk) {
    return response.status(404).json({ message: 'Pessoa palestrante não encontrada' });
  }
  return response.status(200).json(tk);
});

//  REQ 3 - Crie o endpoint POST `/login`
//  REQ 4 - validar email e password

app.post('/login', emailValidation, passwordValidation, async (_req, res) => {
  const token = crypto.randomBytes(8).toString('hex');
  res.status(200).json({ token });
});

// // REQ 5 - Crie o endpoint POST /talker

  app.post('/talker', 
    tokenValidation, 
    talkerNameValidation, 
    talkerAgeValidation,
    talkerTalkValidation, talkerwatchedAtValidation, talkerRateValidation, async (req, res) => {
    const talkers = await getTalkers();
    const { name, age, talk } = req.body;
    const newTalker = {
      id: talkers.length + 1,
      name,
      age,
      talk,
    }; // cria um novo talker
    talkers.push(newTalker);
    await fs.writeFile('./talker.json', JSON.stringify(talkers));
    res.status(201).json(newTalker);
  });

// ## 6 - Crie o endpoint PUT `/talker/:id`

  app.put('/talker/:id',
    tokenValidation,
    talkerNameValidation,
    talkerAgeValidation,
    talkerTalkValidation, talkerwatchedAtValidation, talkerRateValidation, async (req, res) => {
    const { id } = req.params;
    const talkers = await getTalkers();
    const talkerPut = talkers.find((talker) => talker.id === Number(id));
    if (!talkerPut) {
      return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
    }
    const { name, age, talk } = req.body;
    talkerPut.id = Number(id);
    talkerPut.name = name;
    talkerPut.age = age;
    talkerPut.talk = talk;
    await fs.writeFile('./talker.json', JSON.stringify(talkers));
    res.status(200).json(talkerPut);
  });

 // ## 7 - Crie o endpoint DELETE `/talker/:id`

  app.delete('/talker/:id',
    tokenValidation,
    async (req, res) => {
      const { id } = req.params;
      const talkers = await getTalkers();
      const talkerDelete = talkers.find((talker) => talker.id === Number(id));
      if (!talkerDelete) {
        return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
      }
      const talkersFiltered = talkers.filter((talker) => talker.id !== Number(id));
      await fs.writeFile('./talker.json', JSON.stringify(talkersFiltered));
      res.status(204).json();
    });

app.listen(PORT, () => {
  console.log('Online');  
});
