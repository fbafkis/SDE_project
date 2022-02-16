const express = require('express')

const app = express()
const port = 3002
app.use(express.urlencoded());

//Interactions result codes

const INTERACTION_OK = 200;
const INTERACTION_FAIL = 408;
const INTERACTION_BAD = 500;

//Timeouts

const INPUT_SENSORS_TIMEOUT = 5000;

//Inputs codes

const WIND_SPEED_SENSOR = 1;
const HUMIDITY_SENSOR = 2;
const RAIN_SENSOR = 3;
const EXTERNAL_TEMPERATURE_SENSOR = 4;
const MOTION_SENSOR = 5;
const INTERNAL_TEMPERATURE_SENSOR = 6;

//Inputs

var inputs = [
    {
        clientId: 1,
        inputId: 1,
        inputType: WIND_SPEED_SENSOR,
        unique: true,
        name: 'Wind speed sensor'
    },
    {
        clientId: 1,
        inputId: 2,
        inputType: HUMIDITY_SENSOR,
        unique: true,
        name: 'Humidity sensor'
    },
    {
        clientId: 1,
        inputId: 3,
        inputType: RAIN_SENSOR,
        unique: true,
        name: 'Rain sensor'
    },
    {
        clientId: 1,
        inputId: 4,
        inputType: EXTERNAL_TEMPERATURE_SENSOR,
        unique: true,
        name: 'External temp sensor'
    },
    {
        clientId: 2,
        inputId: 5,
        inputType: MOTION_SENSOR,
        unique: false,
        name: 'Motion sensor livingroom'
    },
    {
        clientId: 3,
        inputId: 6,
        inputType: MOTION_SENSOR,
        unique: false,
        name: 'Motion sensor bedroom'
    },
    {
        clientId: 2,
        inputId: 7,
        inputType: INTERNAL_TEMPERATURE_SENSOR,
        unique: false,
        name: 'Temperature sensor livingroom'
    },
    {
        clientId: 3,
        inputId: 8,
        inputType: INTERNAL_TEMPERATURE_SENSOR,
        unique: false,
        name: 'Temperature sensor bedroom'
    },
]
///////////////////////////////Input reading request's management

app.get('/readInput', (req, res) => {

    var inputId = req.query.inputId;
    console.log(new Date().toLocaleTimeString() + ' - Received request for reading input number ' + inputId + '!');

    var currentInput;

    for (input of inputs) {
        if (inputId == input.inputId) {
            currentInput = input;
        }
    }

    if (currentInput.inputType == EXTERNAL_TEMPERATURE_SENSOR) {
        var result = {
            statusCode: INTERACTION_OK,
            value: 215
        }
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Value of input "' + currentInput.name + '" with id ' + inputId + ' sent correctly!');
            console.log(result);
            res.json(result);
        }, INPUT_SENSORS_TIMEOUT - 1500);

    } else {
        var result = {
            statusCode: INTERACTION_OK,
            value: 70
        }
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Value of input "' + currentInput.name + '" with id ' + inputId + ' sent correctly!');
            console.log(result);
            res.json(result);
        }, INPUT_SENSORS_TIMEOUT - 4000);
    }
});

//Starting express 

app.listen(port, () => {
    console.log(`Input service of client 1 is listening on port ${port}`)
})