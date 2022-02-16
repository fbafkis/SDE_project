const axios = require('axios');
const express = require('express');
const app = express()
const port = 3000

//Timeouts

const STANDARD_TIMEOUT = 2000;
const CENTRAL_HEATING_SYSTEM_TIMEOUT = 3000;
const HEATING_VALVE_TIMEOUT = 1500;
const SHUTTERS_TIMEOUT = 30000;
const FIXTURES_TIMEOUT = 20000;
const INPUT_SENSORS_TIMEOUT = 5000;

//Intervals internal to decisional service

const WEATHER_CHECK_INTERVAL = 3600000;
const WEATHER_ROUTINE_MANAGER_INTERVAL = 10000;
const TEMPERATURE_ROUTINE_MANAGER_INTERVAL = 15000;

//Interactions result codes

const INTERACTION_OK = 200;
const INTERACTION_FAIL = 408;
const INTERACTION_BAD = 500;

//Weather variables and tresholds

var riskyWeather = false;
var coldWeather = false;

var standardTreshold = 30;
var windSpeedValueTreshold = standardTreshold;
var humidityValueTreshold = standardTreshold;
var rainValueTreshold = standardTreshold;
var externalTemperatureTreshold = 300;

//Routines

var routine0 = {
    id: 0,
    value: 'readAllWeatherSensors',
    type: 0, // Stateless routine.
    timeout: INPUT_SENSORS_TIMEOUT
};

var routine1 = {
    id: 1,
    value: 'closeAllFixtures',
    type: 1,
    activationStatus: false,
    timeout: SHUTTERS_TIMEOUT + FIXTURES_TIMEOUT
};

var routine2 = {
    id: 2,
    value: 'getPresence',
    type: 0, // Stateless routine.
    timeout: INPUT_SENSORS_TIMEOUT
};

var routine3 = {
    id: 3,
    value: 'setRoomsTemperature',
    type: 1,
    activationStatus: true,
    timeout: STANDARD_TIMEOUT
};

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
        roomName: 'Room1',
        internal: true,
        roomInputs: [5],
        roomOutputs: [1, 2, 3, 4],
        roomClients: [2]
    },
    {
        roomId: 3,
        roomName: 'Room2',
        internal: true,
        roomInputs: [6],
        roomOutputs: [5, 6, 7],
        roomClients: [3]
    }
];

var roomsEmptyTemperatures = [
    {
        roomId: 2,
        temperature: 285
    },
    {
        roomId: 3,
        temperature: 291
    }
];

var roomsPresences = [];

var orchestrationService = {
    address: 'localhost',
    port: 3001,
    name: 'fbhouse orchestrator'
};

///////////////////////////////Decisional process management

//Starting to check hourly for the weather

(async function () { await checkWeatherForecast(); })();

setInterval(function () {
    checkWeatherForecast();
}, WEATHER_CHECK_INTERVAL);

//Starting to call decisional method for weather-based routines every 10 minutes

setInterval(function () {
    weatherRoutinesManager();
}, WEATHER_ROUTINE_MANAGER_INTERVAL);

//Starting to call decisional method for weather-based routines every 10 minutes

setInterval(function () {
    temperatureRoutinesManager();
}, TEMPERATURE_ROUTINE_MANAGER_INTERVAL);

//Decisional method for weather-based routines

async function weatherRoutinesManager() {
    console.log(new Date().toLocaleTimeString() + ' - Routine 1 enabled: ' + routine1.activationStatus);
    console.log(new Date().toLocaleTimeString() + ' - All the weather tresholds are setted at: ' + standardTreshold)
        if (riskyWeather == true && routine1.activationStatus != true) {
            var routineResult = await callRoutine(routine0);
            if (routineResult.statusCode == INTERACTION_FAIL) {
                console.log(new Date().toLocaleTimeString() + ' - There was an error in retrieving the weather sensor values from the system!')
            } else if (routineResult.statusCode == INTERACTION_OK) {
                if (await decideRoutine1OnWeatherSensors(routineResult) && (routine1.activationStatus != true)) {
                    console.log(new Date().toLocaleTimeString() + ' - Calling routine 1! Now waiting for its execution...');
                    routine1.activationStatus = true;
                    routineResult = await callRoutine(routine1);
                    if (routineResult.statusCode == INTERACTION_FAIL) {
                        console.log(new Date().toLocaleTimeString() + ' - There was an error in activating the routine that closes all the fixtures!')
                        routine1.activationStatus = false;
                    } else {
                        if (routineResult.statusCode == INTERACTION_OK) {
                            console.log(new Date().toLocaleTimeString() + ' - The routine that closes all the fixtures has been executed correctly! ');
                            routine1.activationStatus = true;
                        } else if (routineResult.statusCode == INTERACTION_BAD) {
                            console.log(new Date().toLocaleTimeString() + ' - There was a problem while executing the routine to close all the fixtures! Check all the systems!');
                            routine1.activationStatus = false;
                        }
                    }
                }
            } else if (routineResult.statusCode == INTERACTION_BAD) {
                console.log(new Date().toLocaleTimeString() + ' - There was a problem while executing the routine to get all the sensor values! Check all the systems!');
            }
        }
}

//Decisional method for temperature-based routines

async function temperatureRoutinesManager() {
    console.log(new Date().toLocaleTimeString() + ' - Routine 3 manual activation: ' + routine3.activationStatus);
    console.log(new Date().toLocaleTimeString() + ' - The external temperature treshold is setted at: ' + externalTemperatureTreshold);
    if (coldWeather && routine3.activationStatus == true) {
        var routineResult = await callRoutine(routine0);
        if (routineResult.statusCode == INTERACTION_FAIL) {
            console.log(new Date().toLocaleTimeString() + ' - There was an error in retrieving the external temperature from the system!');
        } else if (routineResult.statusCode == INTERACTION_OK) {
            if (routineResult.externalTemperatureSensorValue < externalTemperatureTreshold) {
                routineResult = await callRoutine(routine2);
                if (routineResult.statusCode == INTERACTION_FAIL) {
                    console.log(new Date().toLocaleTimeString() + ' - There was an error in retrieving the presence of people in the rooms from the system! The main routine will be now disabled!');
                    routine3.activationStatus = false;
                } else if (routineResult.statusCode == INTERACTION_OK) {
                    roomsPresences = routineResult.roomsPresences;
                    routineResult = await callRoutine(routine3);
                    if (routineResult.statusCode == INTERACTION_FAIL) {
                        console.log(new Date().toLocaleTimeString() + ' - There was an error in setting the idle temperatures in every room! The routine will now be disabled!');
                        routine3.activationStatus = false;
                    } else if (routineResult.statusCode == INTERACTION_OK) {
                        console.log(new Date().toLocaleTimeString() + ' - Idle temperatures in the rooms have been setted correctly!');
                    } else if (routineResult.statusCode == INTERACTION_BAD) {
                        console.log(new Date().toLocaleTimeString() + ' - There was a problem while executing the routine to set the idle temperatures in every room! Check all the systems! The routine will now be disabled!');
                        routine3.activationStatus = false;
                    }
                } else if (routineResult.statusCode == INTERACTION_BAD) {
                    console.log(new Date().toLocaleTimeString() + ' - There was a problem while executing the routine to retrieve the presence of people in the rooms! Check all the systems! The main routine will be now disabled!');
                    routine3.activationStatus = false;
                }
            }
        } else if (routineResult.statusCode == INTERACTION_BAD) {
            console.log(new Date().toLocaleTimeString() + ' - There was a problem while executing the routine to retrieve external temperature from sensor! Check all the systems!');
        }
    }
}

//Function that check trough api the weather and sets the riskyWeather flag deciding on the retrieved information

async function checkWeatherForecast() {
    var weather = await retrieveWeather();

    if (weather.windSpeed > windSpeedValueTreshold || weather.humidity > humidityValueTreshold || weather.weatherMain == 'Rain') {
        riskyWeather = true;
        console.log(new Date().toLocaleTimeString() + ' - Risky weather detected!');
    } else riskyWeather = false;

    if (weather.temperature < externalTemperatureTreshold) {
        coldWeather = true;
        console.log(new Date().toLocaleTimeString() + ' - Cold weather detected!')
    } else {
        coldWeather = false;
    }
}

//Function to decide if to call routine 1 on the basis of the weather sensors values

async function decideRoutine1OnWeatherSensors(routineResult) {
    if ((routineResult.windSpeedSensorValue > windSpeedValueTreshold) || (routineResult.humiditySensorValue > humidityValueTreshold)
        || (routineResult.rainSensorValue > rainValueTreshold)) {
        return true;
    }
    return false;
}

//Function to retrieve weatherdata through api

async function retrieveWeather() {

    var weather = {
        windSpeed: null,
        humidity: null,
        temperature: null,
        weatherMain: null
    };

    try {
        const response = await axios.get('https://api.openweathermap.org/data/2.5/onecall?lat=45.883460&lon=10.847325' +
            '&exclude=daily,minutely,current,alerts&appid=aa687739ac4b7b69b7addc4adb56042c');
        console.log(new Date().toLocaleTimeString() + ' - Weather retrieved successfully from API!');
        weather.windSpeed = response.data.hourly[1].wind_speed;
        weather.humidity = response.data.hourly[1].humidity;
        weather.temperature = response.data.hourly[1].temp;
        weather.weatherMain = response.data.hourly[1].weather[0].main;
        return weather;

    } catch (error) {
        console.log(new Date().toLocaleTimeString() + ' - Error in retrieving weather data!');
        console.log(error);
    }
}

//Function to invoke routines on the orchestration service

async function callRoutine(routine) {
    if (routine.id == 0) {
        var result = {
            statusCode: null,
            windSpeedSensorValue: null,
            humiditySensorValue: null,
            rainSensorValue: null,
            externalTemperatureSensorValue: null
        }

        try {
            const response = await axios.get('http://' + orchestrationService.address + ':'
                + orchestrationService.port + '/' + routine0.value, { timeout: routine0.timeout });

            result.statusCode = response.data.statusCode;
            result.windSpeedSensorValue = response.data.readings.windSpeedSensorValue;
            result.humiditySensorValue = response.data.readings.humiditySensorValue;
            result.rainSensorValue = response.data.readings.rainSensorValue;
            result.externalTemperatureSensorValue = response.data.readings.externalTemperatureSensorValue; //This is only the external temperature
            return result;

        } catch (error) {
            console.log(new Date().toLocaleTimeString() + ' - It was not possible to ask routine ' + routine.id + ' execution. Check the orchestration service, it\'s unreachable or it genereted an HTTP error!');
            result.statusCode = INTERACTION_FAIL;
            return result;
        }
    } else if (routine.id == 1) {
        var result = {
            statusCode: null
        }
        try {
            const response = await axios.post('http://' + orchestrationService.address + ':'
                + orchestrationService.port + '/' + routine1.value, { timeout: routine1.timeout });
            result.statusCode = response.data.statusCode;
            return result;
        } catch (error) {
            console.log(new Date().toLocaleTimeString() + ' - It was not possible to ask routine ' + routine.id + ' execution. Check the orchestration service, it\'s unreachable or it genereted an HTTP error!');
            result.statusCode = INTERACTION_FAIL;
            //console.log(error);
            return result;
        }
    } else if (routine.id == 2) {

        var result = {
            statusCode: null,
            roomsPresences: [
                {
                    roomId: null,
                    presence: null
                }
            ]
        }
        try {
            const response = await axios.get('http://' + orchestrationService.address + ':'
                + orchestrationService.port + '/' + routine2.value, { timeout: routine2.timeout });
            result.statusCode = response.data.statusCode;
            result.roomsPresences = response.data.roomsPresences;
            return result;
        } catch (error) {
            console.log(new Date().toLocaleTimeString() + ' - It was not possible to ask routine ' + routine.id + ' execution. Check the orchestration service, it\'s unreachable or it genereted an HTTP error!');
            result.statusCode = INTERACTION_FAIL;
            return result;
        }

    } else if (routine.id == 3) {

        var values = [];

        for (room of rooms) {
            if (room.internal == true) {
                for (roomPresence of roomsPresences) {
                    if (roomPresence.roomId == room.roomId) {
                        if (roomPresence.presence == false) {
                            for (roomsEmptyTemperature of roomsEmptyTemperatures) {
                                if (roomsEmptyTemperature.roomId == room.roomId) {
                                    var value = {
                                        roomId: room.roomId,
                                        temperature: roomsEmptyTemperature.temperature
                                    }
                                    values.push(value);
                                }
                            }
                        }
                    }
                }
            }
        }

        try {
            var result = {
                statusCode: null
            };
            const response = await axios.post('http://' + orchestrationService.address + ':'
                + orchestrationService.port + '/' + routine3.value,
                { values: values },
                { timeout: routine3.timeout });
            result.statusCode = response.data.statusCode;
            return result;
        } catch (error) {
            console.log(new Date().toLocaleTimeString() + ' - It was not possible to ask routine ' + routine.id + ' execution. Check the orchestration service, it\'s unreachable or it genereted an HTTP error!');
            result.statusCode = INTERACTION_FAIL;
            return result;
        }
    }
}

///////////////////////////////Receive communications from orchestration service

//Retrieve the notification of deactivation for a routine (something that leads to the deactivation of a specific routine happened)

app.get('/deactivateRoutine', (req, res) => {

    var notification = {
        routineId: req.query.routineId,
        routineError: req.query.isError
    }
    res.sendStatus(200);
    manageRoutineDeactivation(notification);
})

//Function to deactivate all routines that are enabled automatically

app.get('/deactivateAllAutomaticRoutines', (req, res) => {

    routine1.activationStatus = false;
    console.log(new Date().toLocaleTimeString() + ' - All the automatic enabling routines has been deactivated!');

    res.sendStatus(200);
})

//Function to manage notification of routine deactivated from orchestrator

function manageRoutineDeactivation(notification) {

    if (notification.routineId == 1) {
        if (routine1.activationStatus == true) {
            if (!notification.isError) {
                console.log(new Date().toLocaleTimeString() + ' - The routine that closes all the fixtures has been deactivated!')
            } else if (notification.isError) {
                console.log(new Date().toLocaleTimeString() + ' - The routine that closes all the fixtures has been deactivated because of a malfunction! Check all the systems!')
            }
            routine1.activationStatus == false;
        }
    } else if (notification.routineId == 3) {
        if (routine3.activationStatus == true) {
            if (!notification.isError) {
                console.log(new Date().toLocaleTimeString() + ' - The routine that sets automatically the rooms\` temperatures has been deactivated!')
            } else if (notification.isError) {
                console.log(new Date().toLocaleTimeString() + ' - The routine that sets automatically the rooms\` temperatures has been deactivated because of a malfunction! Check all the systems!')
            }
            routine3.activationStatus == false;
        }
    }
}

//Starting express 

app.listen(port, () => {
    console.log(`Decisional service is listening on port ${port}`)
});
