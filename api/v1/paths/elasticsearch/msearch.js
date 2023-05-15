const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
const ConfigManager = require("../../../../bin/configManager.");
const UserRequestFiltering = require("../../../../bin/userRequestFiltering.");

const { processResponse } = require("../utils");
const httpProxy = require("../../../../bin/httpProxy.");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        if (ConfigManager.config) {
            ConfigManager.getUser(req, res, function (err, userInfo) {
                if (err) {
                    return res.status(400).json({ error: err });
                }

                ConfigManager.getUserSources(req, res, function (err, userSources) {
                    UserRequestFiltering.validateElasticSearchIndices(userInfo.user.groups, req.body.indexes, userSources, "r", function (parsingError, filteredQuery) {
                        if (parsingError) return processResponse(res, parsingError, null);

                        elasticRestProxy.executeMsearch(req.body.ndjson, function (err, result) {
                            if (err) {
                                return res.status(400).json({ error: err });
                            }
                            return res.status(200).json(result);
                        });
                    });
                });
            });
        } else {
            elasticRestProxy.executeMsearch(req.body.ndjson, function (err, result) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                return res.status(200).json(result);
            });
        }
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Elasticsearch msearch",
        description: "Elasticsearch msearch",
        operationId: "Elasticsearch msearch",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        ndjson: {
                            type: "string",
                        },
                        indexes: {
                            type: "array",
                        },
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
