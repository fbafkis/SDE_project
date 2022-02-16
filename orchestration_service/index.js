const express = require('express')
const axios = require('axios');
const bodyParser = require('body-parser');
const res = require('express/lib/response');


const app = express();
const port = 3001;
app.use(bodyParser.json());

//Timeouts

const STANDARD_TIMEOUT = 2000;
const CENTRAL_HEATING_SYSTEM_TIMEOUT = 3000;
const HEATING_VALVE_TIMEOUT = 1500;
const SHUTTERS_TIMEOUT = 30000;
const FIXTURES_TIMEOUT = 20000;
const INPUT_SENSORS_TIMEOUT = 5000;

//Intervals internal to orchestration service

var PRESENCE_TRIGGER_INTERVAL = 30000;
var HEATING_CORE_INTERVAL = 20000;

//Inputs codes

const WIND_SPEED_SENSOR = 1;
const HUMIDITY_SENSOR = 2;
const RAIN_SENSOR = 3;
const EXTERNAL_TEMPERATURE_SENSOR = 4;
const MOTION_SENSOR = 5;
const INTERNAL_TEMPERATURE_SENSOR = 6;

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

var weatherSensors = [1, 2, 3, 4];

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

var fixtures = [1, 2, 3, 4, 5, 6, 7];

//Rooms' informations

var rooms = [
    {
        roomId: 1,
        roomName: 'Garden',
        internal: false,
        roomInputs: [1, 2, 3, 4],
        roomOutputs: [],
        roomClients: [1]
    },
    {
        roomId: 2,
        roomName: 'Livingroom',
        internal: true,
        roomInputs: [5],
        roomOutputs: [1, 2, 3, 4, 8],
        roomClients: [2]
    },
    {
        roomId: 3,
        roomName: 'Bedroom',
        internal: true,
        roomInputs: [6],
        roomOutputs: [5, 6, 7],
        roomClients: [3]
    }
];

var roomsPresences = [];

var currentRoomsTemperatures = [];

var defaultRoomTemperatures = [
    {
        roomId: 2,
        temperature: 282
    },
    {
        roomId: 3,
        temperature: 289
    }
]

//Clients

var clients = [
    {
        address: 'localhost',
        inputPort: 3002,
        outputPort: 3003,
        roomId: 1,
        name: 'client1',
        clientId: 1
    },
    {
        address: 'localhost',
        inputPort: 3004,
        outputPort: 3005,
        roomId: 2,
        name: 'client2',
        clientId: 2
    },
    {
        address: 'localhost',
        inputPort: 3006,
        outputPort: 3007,
        roomId: 3,
        name: 'client3',
        clientId: 3
    }
];

//Decisional service

var decisionalService = {
    address: 'localhost',
    port: 3000,
    name: 'fbhouse decisional'
};

//Routines

var routine0 = {
    id: 0,
    value: 'readAllWeatherSensors',
    type: 0, // Stateless routine.
    timeout: INPUT_SENSORS_TIMEOUT
}

var routine1 = {
    id: 1,
    value: 'closeAllFixtures',
    type: 1,
    activationStatus: false,
    timeout: SHUTTERS_TIMEOUT + FIXTURES_TIMEOUT
}

var routine2 = {
    id: 2,
    value: 'getPresence',
    type: 0, // Stateless routine.
    timeout: INPUT_SENSORS_TIMEOUT
}

var routine3 = {
    id: 3,
    value: 'setRoomsTemperature',
    type: 1,
    activationStatus: true,
    timeout: STANDARD_TIMEOUT
}

///////////////////////////////Initialization

//Starting to call the heating core method

setInterval(function () {
    heatingCore();
}, HEATING_CORE_INTERVAL);

//At startup the current rooms temperatures are setted to default values

currentRoomsTemperatures = defaultRoomTemperatures;

//At startup the last motion detections of all the rooms are setted to null 

(function () {
    for (room of rooms) {
        var roomsPresence = {
            roomId: room.roomId,
            lastUpdate: null
        }
        roomsPresences.push(roomsPresence);
    };
})();

///////////////////////////////Routine management

//At startup (in case of crashing) notify to the decisional service that all the routines has been deactivated

deactivateAllAutomaticRoutines();

//Function to notify routine deactivation to the decisional server

async function deactivateRoutine(routineId, isError) {
    try {
        const response = await axios.get('http://' + decisionalService.address + ':'
            + decisionalService.port + '/deactivateRoutine?routineId=' + routineId + '&isError=' + isError, { timeout: STANDARD_TIMEOUT });
        console.log(new Date().toLocaleTimeString() + ' - Routine deactivation notified!');

    } catch (error) {
        console.log(new Date().toLocaleTimeString() + ' - Error in deactivating routine! Maybe the decisional service is not reachable!');
    }
}

//Function to deactivate all deactivate all routines that are enabled automatically

async function deactivateAllAutomaticRoutines() {
    try {
        const response = await axios.get('http://' + decisionalService.address + ':'
            + decisionalService.port + '/deactivateAllAutomaticRoutines', { timeout: STANDARD_TIMEOUT });
        console.log(new Date().toLocaleTimeString() + ' - Routine deactivation notified!');

    } catch (error) {
        console.log(new Date().toLocaleTimeString() + ' - Error in deactivating routine! Maybe the decisional service is not reachable!');
    }
}

//Interception of Routine0 request

app.get('/' + routine0.value, async (req, res) => {
    var result = await routineDispatcher(0);
    res.json(result);
});

//Interception of Routine1 request

app.post('/' + routine1.value, async (req, res) => {
    var result = await routineDispatcher(1);
    res.json(result);
});

//Interception of Routine2 request

app.get('/' + routine2.value, async (req, res) => {
    var result = await routineDispatcher(2);
    res.json(result);
});

//Interception of Routine3 request

app.post('/' + routine3.value, async (req, res) => {
    currentRoomsTemperatures = req.body.values;
    var result = {
        statusCode: INTERACTION_OK
    }
    console.log(new Date().toLocaleTimeString() + ' - The rooms\` temperature values from the decisional service have been applied correctly!');
    res.json(result);
});

//Function that manages the routines execution

async function routineDispatcher(routineId) {

    //Routine 0 actuation

    if (routineId == 0) {

        //Select only weather sensors from input
        relevantInputs = [];
        for (var weatherSensor of weatherSensors) {
            var id = weatherSensor;
            for (var input of inputs) {
                if (id == input.inputId) {
                    relevantInputs.push(input);
                }
            };
        };

        var routineResult = {
            statusCode: INTERACTION_OK,
            readings: {
                windSpeedSensorValue: null,
                humiditySensorValue: null,
                rainSensorValue: null,
                externalTemperatureSensorValue: null
            }
        }

        var endpoints = [];

        //Compose the endpoints

        for (var relevantInput of relevantInputs) {
            var clientId = relevantInput.clientId
            var client;
            for (var clientEl of clients) {
                if (clientEl.clientId == clientId) {
                    client = clientEl;
                }
            };

            var endpoint = {
                url: 'http://' + client.address + ':' + client.inputPort + '/readInput?inputId=' + relevantInput.inputId,
                inputName: relevantInput.name,
                clientName: client.name,
                inputType: relevantInput.inputType
            }
            endpoints.push(endpoint);
        }

        for (endpoint of endpoints) {
            console.log(new Date().toLocaleTimeString() + ' - Request to read input "' + endpoint.inputName + '" sent to client "' + endpoint.clientName + '"!');
        }

        await Promise.all(endpoints.map((endpoint) => axios.get(endpoint.url, { timeout: routine0.timeout })))
            .then(
                (data) => {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].data.statusCode == INTERACTION_OK) {
                            console.log(new Date().toLocaleTimeString() + ' - Success in reading input "' + endpoints[i].inputName + '" on client "' + endpoints[i].clientName + '"!');
                            switch (endpoints[i].inputType) {
                                case WIND_SPEED_SENSOR:
                                    routineResult.readings.windSpeedSensorValue = data[i].data.value;
                                    break;
                                case HUMIDITY_SENSOR:
                                    routineResult.readings.humiditySensorValue = data[i].data.value;
                                    break;
                                case EXTERNAL_TEMPERATURE_SENSOR:
                                    routineResult.readings.externalTemperatureSensorValue = data[i].data.value;
                                    break;
                                case RAIN_SENSOR:
                                    routineResult.readings.rainSensorValue = data[i].data.value;
                                    break;
                                default:
                                    console.log(`This is not a weather sensor! Critical orchestration service error!`);
                                    routineResult.statusCode = INTERACTION_BAD;
                            }
                        } else
                            if (data[i].data.statusCode == INTERACTION_BAD) {
                                routineResult.statusCode = INTERACTION_BAD;
                                console.log(new Date().toLocaleTimeString() + ' - There was a problem retrieving value from input "' + endpoints[i].inputName + '", check client "' + endpoints[i].clientName + '"!');
                            }
                    }
                }
            )
            .catch((error) => {

                var urlSearchParams = new URLSearchParams(error.request._options.search);
                const params = Object.fromEntries(urlSearchParams.entries());
                var clientName;
                var inputName;

                for (var input of inputs) {
                    if (input.inputId == params.inputId) {
                        var inputName = input.name;
                        var clientId = input.clientId
                        for (var clientEl of clients) {
                            if (clientEl.clientId == clientId) {
                                clientName = clientEl.name;
                            }
                        };
                    };
                };
                console.log(new Date().toLocaleTimeString() + ' - Error contacting client ' + clientName + ' to read input ' + inputName + '! It\'s unreachable or it genereted an HTTP error!');
                routineResult.statusCode = INTERACTION_FAIL;
            });
        return routineResult;
    }

    //Routine 1 actuation

    else if (routineId == 1) {

        relevantOutputs = [];
        for (var fixture of fixtures) {
            var id = fixture;
            for (var output of outputs) {
                if (id == output.outputId) {
                    relevantOutputs.push(output);
                }
            };
        };

        var routineResult = {
            statusCode: INTERACTION_OK
        }

        var endpoints = [];

        for (var relevantOutput of relevantOutputs) {
            var clientId = relevantOutput.clientId
            var client;
            for (var clientEl of clients) {
                if (clientEl.clientId == clientId) {
                    client = clientEl;
                }
            };

            var endpoint = {
                url: 'http://' + client.address + ':' + client.outputPort + '/actuateOutput',
                outputId: relevantOutput.outputId,
                outputName: relevantOutput.name,
                clientName: client.name
            }
            endpoints.push(endpoint);
        }

        for (endpoint of endpoints) {
            console.log(new Date().toLocaleTimeString() + ' - Request to operate output "' + endpoint.outputName + '" sent to client "' + endpoint.clientName + '"!');
        }

        await Promise.all(endpoints.map((endpoint) => axios.post(endpoint.url,
            { outputId: endpoint.outputId, clientName: endpoint.clientName, outputName: endpoint.outputName },
            { timeout: routine1.timeout })))
            .then(
                (data) => {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].data.statusCode == INTERACTION_BAD) {
                            routineResult.statusCode = INTERACTION_BAD;
                            console.log(new Date().toLocaleTimeString() + ' - There was a problem operating output "' + endpoints[i].outputName + '", check client "' + endpoints[i].clientName + '"!');
                        } else if (data[i].data.statusCode == INTERACTION_OK) {
                            console.log(new Date().toLocaleTimeString() + ' - Success in operating output "' + endpoints[i].outputName + '"!');
                        }
                    }
                }
            )
            .catch((error) => {
                var data = JSON.parse(error.config.data);
                console.log(new Date().toLocaleTimeString() + ' - Error contacting client "' + data.clientName + '" to operate output "' + data.outputName + '"! It\'s unreachable or it genereted an HTTP error!');
                // console.log(error);
                routineResult.statusCode = INTERACTION_FAIL;
            });
        return routineResult;
    }

    //Routine 2 actuation

    else if (routineId == 2) {

        var result = {
            statusCode: INTERACTION_OK,
            roomsPresences: []
        };

        for (roomsPresence of roomsPresences) {
            var presence;

            if (((Date.now() - roomsPresence.lastUpdate) > PRESENCE_TRIGGER_INTERVAL) || (roomsPresence.lastUpdate == null)) {
                presence = false;
            } else { presence = true }
            var entry = {
                roomId: roomsPresence.roomId,
                presence: presence
            }
            result.roomsPresences.push(entry);
        }
        return result;
    }
}

//Starting express  

app.listen(port, () => {
    console.log(`Orchestration service is listening on port ${port}`)
})

///////////////////////////////Heating system management

//Function (subservice) that manages the heating system

async function heatingCore() {

    var relevatedTemperatures = [];

    var readingResult = await getRoomTemperatures();

    if (readingResult.statusCode == INTERACTION_OK) {
        relevatedTemperatures = readingResult.values;
        var areThereRoomsToHeat = false;
        var valvesToClose = [];
        var valvesToOpen = [];
        for (currentRoomsTemperature of currentRoomsTemperatures) {
            for (relevatedTemperature of relevatedTemperatures) {
                if (currentRoomsTemperature.roomId == relevatedTemperature.roomId) {
                    if (currentRoomsTemperature.temperature > relevatedTemperature.temperature) {
                        areThereRoomsToHeat = true;
                        valvesToOpen.push(currentRoomsTemperature.roomId);
                    } else {
                        valvesToClose.push(currentRoomsTemperature.roomId);
                    }
                }
            }
        }

        if (areThereRoomsToHeat) {
            await controlHeatingSystem(1);
        } else {
            controlHeatingSystem(0);
        }

        await controlHeatingValves(valvesToClose, valvesToOpen);

    } else {
        console.log(new Date().toLocaleTimeString() + ' - Error in retrieving rooms temperatures from sensors! Trying to turn off heater and setting default rooms\' temperatures values!');
        controlHeatingSystem(0);
        currentRoomsTemperatures = defaultRoomTemperatures;
        deactivateRoutine(3, true);
    }
}

//Fucntion to actuate heating valves

async function controlHeatingValves(valvesToClose, valvesToOpen) {

    var endpoints = [];

    for (output of outputs) {
        if (output.outputType == HEATING_VALVE) {

            var endpoint = {
                url: null,
                outputName: null,
                outputType: null,
                outputId: null,
                clientName: null,
                command: null
            }

            endpoint.outputName = output.name;
            endpoint.outputType = output.outputType;
            endpoint.outputId = output.outputId;
            for (client of clients) {
                if (output.clientId == client.clientId) {
                    endpoint.url = 'http://' + client.address + ':' + client.outputPort + '/actuateOutput';
                    endpoint.clientName = client.name;
                }
            }

            for (valveToClose of valvesToClose) {
                if (valveToClose == output.roomId) {
                    endpoint.command = 0;
                }
            }

            for (valveToOpen of valvesToOpen) {
                if (valveToOpen == output.roomId) {
                    endpoint.command = 1;
                }
            }
            endpoints.push(endpoint);
        }
    }



    for (endpoint of endpoints) {
        console.log(new Date().toLocaleTimeString() + ' - Request to operate heating valve "' + endpoint.outputName + '" sent to client "' + endpoint.clientName + '"!');
    }

    await Promise.all(endpoints.map((endpoint) => axios.post(endpoint.url,
        { outputId: endpoint.outputId, outputType: endpoint.outputType, clientName: endpoint.clientName, outputName: endpoint.outputName },
        { timeout: routine1.timeout })))
        .then(
            (data) => {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].data.statusCode == INTERACTION_BAD) {
                        console.log(new Date().toLocaleTimeString() + ' - There was a problem operating heating valve "' + endpoints[i].outputName + '", check client "' + endpoints[i].clientName + '"!');
                    } else if (data[i].data.statusCode == INTERACTION_OK) {
                        console.log(new Date().toLocaleTimeString() + ' - Success in operating heating valve "' + endpoints[i].outputName + '"!');
                    }
                }
            }
        )
        .catch((error) => {
            var data = JSON.parse(error.config.data);
            console.log(new Date().toLocaleTimeString() + ' - Error contacting client "' + data.clientName + '" to operate heating valve "' + data.outputName + '"! It\'s unreachable or it genereted an HTTP error!');
        });
}

//Function to turn on or off central heating system

async function controlHeatingSystem(command) {

    var endpoint = {
        url: null,
        outputId: null,
        clientName: null
    }

    for (output of outputs) {
        if (output.outputType == CENTRAL_HEATING_SYSTEM) {
            endpoint.outputId = output.outputId;

            for (client of clients) {
                if (client.clientId == output.clientId) {
                    endpoint.url = 'http://' + client.address + ':' + client.outputPort + '/actuateOutput';
                    endpoint.clientName = client.name;
                }
            }
        }
    }


    try {
        const response = await axios.post(endpoint.url, { outputId: endpoint.outputId, outputType: CENTRAL_HEATING_SYSTEM, command: command }, { timeout: CENTRAL_HEATING_SYSTEM_TIMEOUT });

        if (response.data.statusCode == INTERACTION_OK) {
            if (command == 1) {
                console.log(new Date().toLocaleTimeString() + ' - Heating system turned on succesfully!');
            } else if (command == 0) {
                console.log(new Date().toLocaleTimeString() + ' - Heating system turned off succesfully!')
            }
        } else if (response.data.statusCode == INTERACTION_BAD) {
            console.log(new Date().toLocaleTimeString() + ' - Client "' + endpoint.clientName + '" encountered a problem while operating the heating system! Check it!')
        }
    } catch (error) {
        console.log(new Date().toLocaleTimeString() + ' - Error contacting client "' + endpoint.clientName + '" to operate heating system (output id: ' + endpoint.outputId + ')! It\'s unreachable or it genereted an HTTP error!');
        // console.log(error);

    }

}

//Function to retrieve the temperature of every room 

async function getRoomTemperatures() {

    var endpoints = [];

    for (input of inputs) {
        if (input.inputType == INTERNAL_TEMPERATURE_SENSOR) {

            var currentClient;

            for (client of clients) {
                if (client.clientId == input.clientId) {
                    currentClient = client;
                }
            }

            var currentRoom;

            for (room of rooms) {
                if (currentClient.roomId == room.roomId) {
                    currentRoom = room;
                }
            }

            var endpoint = {
                url: 'http://' + currentClient.address + ':' + currentClient.inputPort + '/' + 'readInput?inputId=' + input.inputId,
                inputName: input.name,
                clientName: currentClient.name,
                roomName: currentRoom.roomName,
                roomId: currentRoom.roomId
            }

            endpoints.push(endpoint);
        }
    }

    var result = {
        statusCode: INTERACTION_OK,
        values: []
    };

    await Promise.all(endpoints.map((endpoint) => axios.get(endpoint.url, { timeout: routine0.timeout })))
        .then(
            (data) => {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].data.statusCode == INTERACTION_OK) {
                        console.log(new Date().toLocaleTimeString() + ' - Success in reading temperature of room ' + endpoints[i].roomName + ' from input ' + endpoints[i].inputName + ' on client ' + endpoints[i].clientName + '!');

                        var value = {
                            roomId: endpoints[i].roomId,
                            temperature: data[i].data.value
                        }

                        result.values.push(value);

                    } else
                        if (data[i].data.statusCode == INTERACTION_BAD) {
                            result.statusCode = INTERACTION_BAD;
                            console.log(new Date().toLocaleTimeString() + ' - There was a problem retrieving temperature value of room ' + endpoints[i].roomName + ' from input' + endpoints[i].inputName + ', check client ' + endpoints[i].clientName + '!');
                        }
                }
            }
        )
        .catch((error) => {

            // console.log(error);
            var urlSearchParams = new URLSearchParams(error.request._options.search);
            const params = Object.fromEntries(urlSearchParams.entries());
            var clientName;
            var inputName;
            var roomName;

            for (var input of inputs) {
                if (input.inputId == params.inputId) {
                    var inputName = input.name;
                    var clientId = input.clientId
                    for (var clientEl of clients) {
                        if (clientEl.clientId == clientId) {
                            for (room of rooms) {
                                if (room.roomId == clientId) {
                                    roomName = room.roomName;
                                }
                            }
                            clientName = clientEl.name;
                        }
                    };
                };
            };
            console.log(new Date().toLocaleTimeString() + ' - Error contacting client ' + clientName + ' to read temperature of room ' + roomName + ' from input ' + inputName + '! It\'s unreachable or it genereted an HTTP error!');
            result.statusCode = INTERACTION_FAIL;
            //console.log(error);
        });

    return result;
}

///////////////////////////////Motion detection management 

//Function that receives the notification of movement relevations from the clients and saves it in the room's corresponding variable

app.post('/reportMotion', async (req, res) => {
    for (room of rooms) {
        for (client of room.roomClients) {
            if (req.body.clientId == client) {
                console.log(new Date().toLocaleTimeString() + ' - Motion detected in room ' + room.roomName + '!');
                for (roomsPresence of roomsPresences) {
                    if (roomsPresence.roomdId == room.roomId) {
                        roomsPresence.lastUpdate = req.body.time;
                    }
                }
            }
        }
    }

    res.sendStatus(200);
});

