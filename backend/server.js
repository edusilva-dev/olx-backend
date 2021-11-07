require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const fileUpload = require('express-fileupload')

const routes = require('./src/routes')

mongoose.connect(process.env.DATABASE, {
  useUnifiedTopology: true
})
mongoose.Promise = global.Promise
mongoose.connection.on('error', error => {
  console.log('Erro ao connectar: ', error)
})

const server = express()

server.use(cors())
server.use(express.json())
server.use(express.urlencoded({ extended: true }))
server.use(fileUpload())

server.use(express.static(__dirname + '/public'))

server.use('/', routes)

server.listen(process.env.PORT, () => {
  console.log(`Servidor rodando no endereço: ${process.env.BASE}`)
})
