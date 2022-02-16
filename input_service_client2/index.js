const express = require('express')
const axios = require('axios');

const app = express();
const port = 3004;
app.use(express.urlencoded());

//Interactions result codes

const INTERACTION_OK = 200;
const INTERACTION_FAIL = 408;
const INTERACTION_BAD = 500;

//Timeouts

const INPUT_SENSORS_TIMEOUT = 5000;
const STANDARD_TIMEOUT = 2000;


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

//Orchestration service

const orchestrationService = {
    address: 'localhost',
    port: 3001,
    name: 'fbhouse orchestrator'
}

///////////////////////////////Motion detection management 

const thisClientId = 2;
const MOTION_DETECTION_INTERVAL = 600000;

setInterval(function () {
    motionDetected();
}, MOTION_DETECTION_INTERVAL);

function motionDetected() {

    axios.post(orchestrationService.address + ':' + orchestrationService.port + '/reportMotion',
        { clientId: thisClientId, time: Date.now() },
        { timeout: STANDARD_TIMEOUT - 1500 })
        .then(
            (data) => {
                if (data.data.statusCode == INTERACTION_OK) {
                    console.log(new Date().toLocaleDateString() + ' - The motion detection has been notified correctly to the orchestration service!')
                }
            }
        )
        .catch((error) => {
            console.log(new Date().toLocaleTimeString() + ' - It was not possible to notify the orchestration service the motion detection! It is unreachable!')
        });
}

///////////////////////////////Input reading request's management

app.get('/readInput', (req, res) => {

    var inputId = req.query.inputId;
    var currentInput;

    for (input of inputs) {
        if (inputId == input.inputId) {
            currentInput = input;
        }
    }

    console.log(new Date().toLocaleTimeString() + ' - Received request for reading input number ' + inputId + ' with name "' + currentInput.name + '"!');


    var result = {
        statusCode: 200,
        value: 70
    }


    if (currentInput.inputType == INTERNAL_TEMPERATURE_SENSOR) {
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Temperature value of sensor "' + currentInput.name + '" sent correctly!');
            console.log(result);
            res.json(result);
        }, INPUT_SENSORS_TIMEOUT - 3000);
    }
});


app.listen(port, () => {
    console.log(`Input service of client 2 is listening on port ${port}`)
})
