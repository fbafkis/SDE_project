const express = require('express')
const bodyParser = require('body-parser');

const app = express()
const port = 3007
app.use(bodyParser.json());

//Timeouts

const STANDARD_TIMEOUT = 2000;
const CENTRAL_HEATING_SYSTEM_TIMEOUT = 3000;
const HEATING_VALVE_TIMEOUT = 1500;
const SHUTTERS_TIMEOUT = 30000;
const FIXTURES_TIMEOUT = 20000;
const INPUT_SENSORS_TIMEOUT = 5000;

//Outputs codes

const WINDOW = 1;
const DOOR = 2;
const SHUTTERS = 3;
const CENTRAL_HEATING_SYSTEM = 4;
const HEATING_VALVE = 5;

//Interactions result codes

const INTERACTION_OK = 200;
const INTERACTION_FAIL = 408;
const INTERACTION_BAD = 500;

//Outputs

var outputs = [
    {
        clientId: 2,
        outputId: 1,
        outputType: SHUTTERS,
        unique: false,
        name: 'Shutters 1 livingroom'
    },
    {
        clientId: 2,
        outputId: 2,
        outputType: WINDOW,
        unique: false,
        name: 'Window 1 livingroom'
    },
    {
        clientId: 2,
        outputId: 3,
        outputType: DOOR,
        unique: false,
        name: 'Door 1 livingroom'
    },
    {
        clientId: 2,
        outputId: 4,
        outputType: SHUTTERS,
        unique: false,
        name: 'Shutters 2 livingroom'
    },
    {
        clientId: 3,
        outputId: 5,
        outputType: WINDOW,
        unique: false,
        name: 'Windoow 1 bedroom'
    },
    {
        clientId: 3,
        outputId: 6,
        outputType: SHUTTERS,
        unique: false,
        name: 'Shutters 1 bedroom'
    },
    {
        clientId: 3,
        outputId: 7,
        outputType: DOOR,
        unique: false,
        name: 'Door 1 bedroom'
    },
    {
        clientId: 3,
        outputId: 8,
        outputType: CENTRAL_HEATING_SYSTEM,
        unique: true,
        name: 'Central heating system'
    },
    {
        clientId: 2,
        outputId: 9,
        outputType: HEATING_VALVE,
        unique: false,
        name: 'Heating valve livingroom'
    },
    {
        clientId: 3,
        outputId: 10,
        outputType: HEATING_VALVE,
        unique: false,
        name: 'Heating valve bedroom'
    }


]

//Output actuation management

app.post('/actuateOutput', (req, res) => {

    var outputId = req.body.outputId;

    var currentOutput;

    for (output of outputs) {
        if (outputId == output.outputId) {
            currentOutput = output;
        }
    }

    console.log(new Date().toLocaleTimeString() + ' - Received request for operate output number ' + outputId + ' with name "' + currentOutput.name + '"!');

    var result = {
        statusCode: INTERACTION_OK
    }

    if (currentOutput.outputType == HEATING_VALVE) {
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Heating valve "' + currentOutput.name + '" has been operated correctly!');
            res.json(result);
        }, HEATING_VALVE_TIMEOUT - 700);
    } else if (currentOutput.outputType == SHUTTERS) {
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Shutter "' + currentOutput.name + '" has been operated correctly!');
            res.json(result);
        }, SHUTTERS_TIMEOUT - 20000);
    } else if (currentOutput.outputType == DOOR) {
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Door "' + currentOutput.name + '" has been operated correctly!');
            res.json(result);
        }, FIXTURES_TIMEOUT - 10000);
    } else if (currentOutput.outputType == WINDOW) {
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Window "' + currentOutput.name + '" has been operated correctly!');
            res.json(result);
        }, FIXTURES_TIMEOUT - 10000);
    } else if (currentOutput.outputType == CENTRAL_HEATING_SYSTEM) {
        setTimeout(() => {
            console.log(new Date().toLocaleTimeString() + ' - Door "' + currentOutput.name + '" has been operated correctly!');
            res.json(result);
        }, CENTRAL_HEATING_SYSTEM_TIMEOUT- 500);
    }
});

app.listen(port, () => {
    console.log(`Output service of client 3 is listening on port ${port}`)
})