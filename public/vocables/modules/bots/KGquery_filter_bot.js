import Sparql_common from "../sparqlProxies/sparql_common.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import _botEngine from "./_botEngine.js";
//import botEngineClass from "./_botEngineClass.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";

var KGquery_filter_bot = (function () {
    var self = {};
    self.title = "Filter Class";
    self.aBotEngine = _botEngine; //new botEngineClass()
    self.start = function (data, currentQuery, validateFn) {
        var startParams = self.aBotEngine.fillStartParams(arguments);
        //self.aBotEngine.fillStartParams(arguments);

        self.data = data;
        self.filter = "";
        self.filterItems = [];
        var workflow = null;
        if (!self.data.nonObjectProperties) {
            workflow = self.workflow_RdfLabel;
        } else {
            workflow = self.workflow_filterClass;
        }

        self.aBotEngine.init(KGquery_filter_bot, workflow, null, function () {
            self.aBotEngine.startParams = startParams;
            self.validateFn = validateFn;
            self.callbackFn = function () {
                var filterLabel = self.aBotEngine.getQueryText();
                return self.validateFn(null, { filter: self.filter, filterLabel: filterLabel, filterParams: self.filterParams });
            };

            self.params = currentQuery;
            SparqlQuery_bot.params = currentQuery;

            self.aBotEngine.nextStep();
        });
    };

    self.workflow_filterClass = {
        listPropertiesFn: {
            choosePropertyOperatorFn: {
                _OR: {
                    ChooseInList: { listIndividualsFn: { listLogicalOperatorFn: { setSparqlQueryFilterFn: {} } } },
                    _DEFAULT: {
                        promptPropertyValueFn: { listLogicalOperatorFn: { setSparqlQueryFilterFn: {} } },
                    },
                },
            },
        },
    };

    self.workflow_RdfLabel = {
        listFilterTypes: {
            _OR: {
                label: { promptIndividualsLabelFn: { listLogicalOperatorFn: { setSparqlQueryFilterFn: {} } } },
                labelsList: { listIndividualsFn: { listLogicalOperatorFn: { setSparqlQueryFilterFn: {} } } },
            },
        },
    };

    self.functionTitles = {
        listPropertiesFn: "Choose an property",
        choosePropertyOperatorFn: "Choose an operator",
        promptPropertyValueFn: "Enter a value ",
        promptIndividualsLabelFn: "Enter a label ",
        listIndividualsFn: "Choose a label ",
    };

    self.functions = {}; //SparqlQuery_bot.functions;

    self.functions.listIndividualsFn = function () {
        Sparql_OWL.getDistinctClassLabels(self.params.source, [self.params.currentClass], {}, function (err, result) {
            if (err) {
                return alert(err);
            }
            var individuals = [];
            result.forEach(function (item) {
                individuals.push({
                    id: item.id.value,
                    label: item.label.value,
                });
            });

            individuals.sort(function (a, b) {
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;
            });
            self.params.individualsFilterType = "labelsList";
            self.aBotEngine.showList(individuals, "individualsFilterValue");
        });
    };
    self.functions.listFilterTypes = function () {
        var choices = [
            { id: "label", label: "rdfs:label contains" },
            { id: "labelsList", label: "Choose rdfs:label" },
        ];
        self.aBotEngine.showList(choices, "individualsFilterType");
    };
    self.functions.listPropertiesFn = function () {
        if (self.params.property) {
            return self.aBotEngine.nextStep();
        }

        //var choices = [{ id: "http://www.w3.org/2000/01/rdf-schema#label", label: "label" }];
        var choices = [];
        if (self.data && self.data.nonObjectProperties) {
            choices = choices.concat(self.data.nonObjectProperties);
        }
        self.aBotEngine.showList(choices, "property", null, null, function (value) {
            self.params.property = value;
            self.aBotEngine.nextStep();
        });
    };

    self.functions.choosePropertyOperatorFn = function () {
        var datatype = null;
        self.data.nonObjectProperties.forEach(function (item) {
            if (item.id == self.params.property) {
                datatype = item.datatype;
            }
        });
        self.params.propertyDatatype = datatype;
        var choices = [];

        if (self.params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
            // propertyOperator = ">";
            choices = ["=", "<", "<=", ">", ">=", "range"];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
            choices = ["=", "<", "<=", ">", ">="]; //, "range"];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
            choices = ["=", "<", "<=", ">", ">="]; //, "range"];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#decimal") {
            choices = ["=", "<", "<=", ">", ">="]; //, "range"];
        } else {
            choices = ["=", "!=", "contains", ">", "!contains", "ChooseInList"];
        }

        self.aBotEngine.showList(choices, "propertyOperator");
    };

    self.functions.promptIndividualsLabelFn = function () {
        self.params.individualsFilterType = "label";
        self.aBotEngine.promptValue("enter value", "individualsFilterValue");
    };

    self.functions.promptPropertyValueFn = function () {
        if (!self.params.propertyDatatype || self.params.propertyDatatype == "xsd:string") {
            self.aBotEngine.promptValue("enter value", "propertyValue");
        } else if (!self.params.propertyDatatype || self.params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
            if (self.params.propertyOperator == "range") {
                DateWidget.showDateRangePicker("widgetGenericDialogDiv", null, null, function (minDate, maxDate) {
                    self.params.dateValueRange = { minDate: minDate, maxDate: maxDate };
                    //   self.functions.setSparqlQueryFilterFn()
                    self.aBotEngine.nextStep();
                });
                return;
            } else {
                self.aBotEngine.promptValue("enter value", "propertyValue", null, { datePicker: 1 });
            }
        } else {
            self.aBotEngine.promptValue("enter value", "propertyValue");
        }
    };

    self.functions.listLogicalOperatorFn = function () {
        var choices = ["end", "AND", "OR"];
        self.aBotEngine.showList(choices, "filterBooleanOperator");
    };

    self.functions.setSparqlQueryFilterFn = function () {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;

        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        var property = self.params.property;
        var propertyOperator = self.params.propertyOperator;
        var propertyValue = self.params.propertyValue;
        var dateValueRange = self.params.dateValueRange;

        var filterBooleanOperator = self.params.filterBooleanOperator;
        if (!filterBooleanOperator || filterBooleanOperator == "end") {
            filterBooleanOperator = "";
        } else if (filterBooleanOperator == "AND") {
            filterBooleanOperator = " && ";
        } else if (filterBooleanOperator == "OR") {
            filterBooleanOperator = " || ";
        }

        var propLabel = Sparql_common.getLabelFromURI(property);
        if (dateValueRange) {
            var minDate = new Date(dateValueRange.minDate).toISOString();
            var maxDate = new Date(dateValueRange.maxDate).toISOString();
            //minDate = common.ISODateStrToRDFString(minDate);
            //maxDate = common.ISODateStrToRDFString(maxDate);
            self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + ">=" + ' "' + minDate + '"^^xsd:dateTime ');
            self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + "<=" + ' "' + maxDate + '"^^xsd:dateTime  &&');
        } else if (propertyValue) {
            if (self.params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
                var dateStr = new Date(propertyValue).toISOString();
                //dateStr = common.ISODateStrToRDFString(dateStr).split(" ")[0];
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + dateStr + '"^^xsd:dateTime');
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:int ');
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:float ');
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#decimal") {
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:decimal ');
            } else {
                if (false && common.isNumber(propertyValue)) {
                    self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + " " + propertyValue + " ");
                } else {
                    //string
                    if (propertyOperator == "=" || propertyOperator == "!=") {
                        self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"');
                    } else {
                        var negation = "";
                        if (propertyOperator.indexOf("!") == 0) {
                            negation = "!";
                        }
                        self.filterItems.push(filterBooleanOperator + negation + "regex(?" + varName + "_" + propLabel + ',"' + propertyValue + '","i")');
                    }
                }
            }
        } else if (individualsFilterType == "label") {
            self.filterItems.push(filterBooleanOperator + "regex(?" + varName + 'Label , "' + individualsFilterValue + '","i")');
        } else if (individualsFilterType == "labelsList" && individualsFilterValue) {
            self.filterItems.push(filterBooleanOperator + " ?" + varName + " =<" + individualsFilterValue + ">");
        } else {
            self.aBotEngine.abort("filter type not implemented");
        }

        if (self.params.filterBooleanOperator == "end") {
            self.functions.writeFilterFn();

            self.aBotEngine.nextStep();
        } else {
            self.aBotEngine.currentObj = self.workflow_filterClass;
            self.aBotEngine.currentBot.params.property = "";
            self.aBotEngine.currentBot.params.propertyDatatype = "";
            self.aBotEngine.currentBot.params.propertyOperator = "";
            self.aBotEngine.currentBot.params.propertyValue = "";
            self.aBotEngine.nextStep();
        }
    };

    self.functions.writeFilterFn = function () {
        var str = "";
        self.filterItems.forEach(function (item) {
            str = item + str;
        });
        var propLabel = Sparql_common.getLabelFromURI(self.params.property);
        self.filter += "FILTER (" + str + ")";
        self.filter = self.filter.replace("Label", "_label");
        self.filterParams = { varName: self.params.varName, property: self.params.property, propertyLabel: propLabel };
    };

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
