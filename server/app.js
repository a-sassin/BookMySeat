const helmet = require('helmet');
const express = require('express');
const Arena = require('bull-arena');
const Bee = require('bee-queue');

const app = express();
const router = express.Router();
const mongoose = require('mongoose');

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const options = require('./swagger.json');
const ErrorClass = require('./services/error.service');
const routes = require('./routes/routes');
const { deletePastData, cancelUnApprovedBookings } = require('./cron/cron');

mongoose
    .connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then(() => {
        console.info(
            `Connected to \x1B[33m${process.env.ENVIRONMENT}\x1B[0m Database`
        );
    })
    .catch((err) => {
        console.log(err);
    });

const arenaConfig = Arena(
    {
        Bee,
        queues: [
            {
                type: 'bee',
                name: 'cancellation-queue',
                hostId: 'try',
            },
            {
                type: 'bee',
                name: 'mailer-queue',
                hostId: 'try',
            },
        ],
    },
    {
        basePath: '/arena',
        disableListen: true,
    }
);
app.use('/', arenaConfig);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin,X-Requested-With,Content-Type,Accept,Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,PATCH,OPTIONS'
    );
    next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsDoc(options)));

app.use('/api/v1', routes(router));

// TODO: Remove this route while deploying in prod
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the seat bookings app' });
});

app.delete('/cleanup', deletePastData);

app.put('/auto-cancel', cancelUnApprovedBookings);

app.all('*', (req) => {
    throw new ErrorClass(`Requested URL ${req.path} not found!`, 404);
});

app.use((err, req, res, next) => {
    const errorCode = err.code || 500;
    res.status(errorCode).send({
        message: err.message || 'Internal Server Error. Something went wrong!',
        status: errorCode,
    });
});

module.exports = app;
