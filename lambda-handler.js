const AWS = require('aws-sdk');

// declare private methods
const getPasswordDecryptPromise = Symbol('getPasswordDecryptPromise');
const init = Symbol('init');
const sanitiseLog = Symbol('sanitiseLog');
const getMaskedValue = Symbol('getMaskedValue');
const MULTI_VALUE_SEPARATOR = ",";

class LambdaHandler {
    constructor(controller, env, event, context, callback, isAnonymous = false) {
        // if (env.LOG_FIELD_FILTERS && env.LOG_FIELD_FILTERS.includes(MULTI_VALUE_SEPARATOR)) {
        //     // Case where value missing
        //     this.logFieldFilters = env.LOG_FIELD_FILTERS.split(MULTI_VALUE_SEPARATOR);
        // } else if (env.LOG_FIELD_FILTERS) {
        //     // Case where only one value - no separator
        //     this.logFieldFilters = [];
        //     this.logFieldFilters.push(env.LOG_FIELD_FILTERS);
        // } else {
        //     this.logFieldFilters = [];
        // }
        // this.logStringFilters = LOG_STRING_FILTERS;
        this.controller = controller;
        this.env = env;
        this.event = event;
        this.context = context;
        this.isAnonymous = isAnonymous;
        // this.userContext = new UserContext(this.event.requestContext);
        // if (callback) {
        //     this.callback = callback;
        // }
        // build envirnoment variables
        this.environmentConfig = {
            oscConfig: {},
            ttConfig: {}
        };

    }

    async execute() {
        return new Promise((resolve) => {
            this[init] ( async (error, pingResponse) => {
                if(!error && !pingResponse) {
                    const controller = new this.controller(this.event, this.userContext, this.environmentConfig, result => {
                        let sanitisedResult = JSON.parse(JSON.stringify(result));
                        console.log('Lambda Result: ');
                        console.log(JSON.stringify( this[sanitiseLog] (sanitisedResult) ) );
                        // Result returns GenericHttpResponse objects, map to lambda response
                        this.callback(null, result.toLambdaResponse());
                    });
                    const result = await controller.execute();
                    if (result) {
                        const sanitisedResult = JSON.parse(JSON.stringify(result));
                        console.log('Lambda Result: ');
                        console.log(JSON.stringify( this[sanitiseLog] (sanitisedResult) ) );
                        // Result returns GenericHttpResponse objects, map to lambda response
                        resolve(result.toLambdaResponse());
                    } else {
                        resolve({});
                    }
                }
                else if(pingResponse) {
                    console.log(pingResponse);
                    if (this.callback) {
                        this.callback(null, pingResponse);
                    }
                    resolve(pingResponse);
                }
                else if (error) {
                    if (this.callback) {
                        this.callback(error);
                    }
                    resolve(error);
                }
            });
        });
    }

    [init] (done) {
        //This will print the Event object in cloudwatch logs with filters on sensitive info
        let sanitisedEvent = JSON.parse(JSON.stringify(this.event));
        console.log('Event: ' + JSON.stringify( this[sanitiseLog] (sanitisedEvent) ) );

        // check for Lambda warm-up ping event, do not perform any processing
        if(this.event.pingEvent) {
            done(null, 'Lambda ping event successful');
            return;
        }

        // check to make sure calling users is authenticated and identifiable
        if (!this.isAnonymous && (this.userContext.userDetails.isAnonymous || this.userContext.userDetails.isUnauthorized)) {
            done(this.userContext.getGenericDeniedResponse().toLambdaResponse());
            return;
        }

        // OSC environment config
        this.environmentConfig.oscConfig.oscHost = this.env.OSC_HOSTNAME;
        this.environmentConfig.oscConfig.oscPort = this.env.OSC_PORT;
        this.environmentConfig.oscConfig.oscTimeout = this.env.OSC_TIMEOUT;
        this.environmentConfig.oscConfig.oscUsername = this.env.OSC_USERNAME;
        this.environmentConfig.oscConfig.oscPassword = this.env.OSC_PASSWORD;
        this.environmentConfig.oscConfig.eligibilityUsername = this.env.OSC_ELIGIBILITY_USERNAME;
        this.environmentConfig.oscConfig.eligibilityPassword = this.env.OSC_ELIGIBILITY_PASSWORD;
        this.environmentConfig.oscConfig.oscQueryEndpoint = this.env.OSC_ENDPOINT_QUERY_URL;
        this.environmentConfig.oscConfig.oscReportEndpoint = this.env.OSC_ENDPOINT_REPORT_URL;
        this.environmentConfig.oscConfig.oscIncidentsEndpoint = this.env.OSC_ENDPOINT_INCIDENTS_URL;
        this.environmentConfig.oscConfig.oscEligibilityEndpoint = this.env.OSC_ENDPOINT_ELIGIBILITY_URL;
        this.environmentConfig.oscConfig.oscContactEndpoint = this.env.OSC_ENDPOINT_CONTACT_URL;
        // TimeTrade environment config -- hosts
        this.environmentConfig.ttConfig.ttHost = this.env.TIMETRADE_HOSTNAME;
        this.environmentConfig.ttConfig.ttPort = this.env.TIMETRADE_PORT;
        this.environmentConfig.ttConfig.ttTimeout = this.env.TIMETRADE_TIMEOUT;
        this.environmentConfig.ttConfig.ttUsername = this.env.TIMETRADE_USERNAME;
        this.environmentConfig.ttConfig.ttPassword = this.env.TIMETRADE_PASSWORD;
        // TimeTrade environment config -- endpoints
        this.environmentConfig.ttConfig.ttAppointmentServiceEndpointPath = this.env.TIMETRADE_APPOINTMENTSERVICE_PATH;
        this.environmentConfig.ttConfig.ttClientServiceEndpointPath = this.env.TIMETRADE_CLIENTSERVICE_PATH;
        this.environmentConfig.ttConfig.ttConfigServiceEndpointPath = this.env.TIMETRADE_CONFIGSERVICE_PATH;
        // TimeTrade environment config -- wsdls
        this.environmentConfig.ttConfig.ttAppointmentServiceWsdlPath = this.env.TIMETRADE_APPOINTMENTSERVICE_WSDL_PATH;
        this.environmentConfig.ttConfig.ttClientServiceWsdlPath = this.env.TIMETRADE_CLIENTSERVICE_WSDL_PATH;
        this.environmentConfig.ttConfig.ttConfigServiceWsdlPath = this.env.TIMETRADE_CONFIGSERVICE_WSDL_PATH;
        // TimeTrade environment config -- operations
        this.environmentConfig.ttConfig.ttGetSlotsOperationName = this.env.TIMETRADE_GET_SLOTS_OPERATION;
        this.environmentConfig.ttConfig.ttGetDaysOperationName = this.env.TIMETRADE_GET_DAYS_OPERATION;
        this.environmentConfig.ttConfig.ttGetNextSlotOperationName = this.env.TIMETRADE_GET_NEXT_SLOT_OPERATION;
        this.environmentConfig.ttConfig.ttLocationOperationName = this.env.TIMETRADE_GET_LOCATION_OPERATION;
        this.environmentConfig.ttConfig.ttBookAppointmentOperationName = this.env.TIMETRADE_BOOK_APPOINTMENT_OPERATION;
        this.environmentConfig.ttConfig.ttCancelAppointmentOperationName = this.env.TIMETRADE_CANCEL_APPOINTMENT_OPERATION;
        this.environmentConfig.ttConfig.ttUpdateInsertClientOperationName = this.env.TIMETRADE_UPDATE_INSERT_CLIENT_OPERATION;
        // Other config
        this.environmentConfig.appointmentType = this.env.APPOINTMENT_TYPE;
        this.environmentConfig.oscAccountId = this.env.OSC_ACCOUNT_ID;
        this.environmentConfig.appointmentSubTypes = this.env.APPOINTMENT_SUB_TYPES;
        this.environmentConfig.specialAppointmentTypes = this.env.SPECIAL_APPOINTMENT_TYPES;
        this.environmentConfig.availableServicesS3Bucket = this.env.AVAILABLE_SERVICES_S3_BUCKET;
        this.environmentConfig.availableServicesS3ObjectKey = this.env.AVAILABLE_SERVICES_S3_OBJECT_KEY;

        // decrypt passwords if not executing locally
        if(!this.env.AWS_SAM_LOCAL){

            var decryptPromises = [Promise.resolve(true), Promise.resolve(true)];
            if(this.environmentConfig.oscConfig.oscPassword) {
                decryptPromises[0] = this[getPasswordDecryptPromise](this.environmentConfig.oscConfig.oscPassword);
            }
            if(this.environmentConfig.ttConfig.ttPassword) {
                decryptPromises[1] = this[getPasswordDecryptPromise](this.environmentConfig.ttConfig.ttPassword);
            }
            if(this.environmentConfig.oscConfig.eligibilityPassword) {
                decryptPromises[2] = this[getPasswordDecryptPromise](this.environmentConfig.oscConfig.eligibilityPassword);
            }

            Promise.all(decryptPromises).then(values => {
                this.environmentConfig.oscConfig.oscPassword = values[0];
                this.environmentConfig.ttConfig.ttPassword = values[1];
                this.environmentConfig.oscConfig.eligibilityPassword = values[2];
                done();
            }).catch( error => {
                done(error);
            });
        }
        else { // execute logic that's only applicable to a local environment
            done();
        }
    }

    [sanitiseLog] (logEntry) {
        if(typeof logEntry === 'string') {
            // if string is parseable JSON, lets parse it and look at fields inside
            try {
                let logEntryJSON = JSON.parse(logEntry);
                logEntry = this[sanitiseLog](logEntryJSON);
            }
            catch(parseError) {
                // un-parseable just search/replace strings we know about
                for(var regex in this.logStringFilters) {
                    if(logEntry.match(this.logStringFilters[regex]) !== null) {
                        logEntry = this[getMaskedValue](logEntry);
                    }
                }
            }
        } else if(typeof logEntry === 'object') {
            for(let i in logEntry) {
                if(typeof logEntry[i] !== 'object' && this.logFieldFilters.includes(i)) {
                    logEntry[i] = this[getMaskedValue](logEntry[i]);
                }
                else {
                    logEntry[i] = this[sanitiseLog](logEntry[i]);
                }
            }
        }
        return logEntry;
    }

    [getMaskedValue] (value) {
        if(value.length === 0) {
            return null;
        }
        else {
            var valueMask = '';
            for(var i = 0; i < value.length; i++) {
                valueMask = valueMask + '*';
            }
            return valueMask;
        }
    }

    [getPasswordDecryptPromise] (password) {
        var kms = new AWS.KMS();
        return new Promise( (resolve, reject) => {
            kms.decrypt({ CiphertextBlob: new Buffer(password, 'base64') },
            (err, decryptedPassword) => {
                if (err) {
                    console.error('Could not decrypt password environment parameter', err);
                    reject(err);
                }
                else {
                    resolve(decryptedPassword.Plaintext.toString('ascii'));
                }
            });
        });
    }
}

