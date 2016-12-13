#!/usr/bin/env node

/**
 * qabot
 *
 * Command Line launcher
 *
 * (c) Troven Software 2009-2015. Apache Licensed.
 *
 */

var _ = require("underscore");

var pkg = require("../package.json");

var qabot = require("meta4qa"), cli = qabot.cli, Runtime = qabot.Runtime, files = qabot.helpers.files, vars = qabot.helpers.vars, assert = qabot.assert;
var debug = require("debug")("qabot");

assert(pkg && pkg.name && pkg.version, "Missing package name/version");

// customize the CLI options

cli.version("qabot v"+pkg.version);
cli.option("--reporter <reporter>", "Mocha reporter [spec|simple|tap|xunit|nyan|progress]");

// commands to run .feature files
cli.command('*').description("[.feature file]").action(function (featureFile) {
    cli.features = featureFile;
    if (arguments.length>2) {
        console.log("Only one .feature file allowed on the command line");
        process.exit(1);
    }
});

// initialize the configuration
debug("version %s (meta4qa v%s)", pkg.version, qabot.pkg.version);

var config = false;
try {
    config = qabot.configure(cli);
    if (!config) {
        cli.help();
        return;
    }
} catch(e) {
    console.log("ERROR: %s", e);
    process.exit(1);
}
config.configFile = "qa.json";
config.name = "qashield";


var qa = new Runtime(config);

// more intuitive configs
qa.config.paths = _.extend({}, pkg.directories, qa.config.paths);
qa.config.reporter = qa.config.reporter || "spec";

// built-in dialects
qa.dialect.learn( require("meta4qa-common"), "common" );
qa.dialect.learn( require("meta4qa-webapi"), "webapi" );
//qa.dialect.learn( require("meta4qa-blueprint"), "blueprint" );

// auto-install dialects
_.each(pkg.dependencies, function(ver, dep) {
    if (dep.indexOf("-dialect")>=0) {
        debug("%s install: %s @ %s",pkg.name, dep, ver);
        qa.dialect.learn( require(dep), dep);
    }
});
_.each(config.dialects, function(dep, name) {
    qa.dialect.learn( require(dep), _.isString(name)?name:dep );
});

vars.env(cli.envPrefix || "QA_", process.env, config);

// if no built-in commands gobbled us, run ./features
if (!qa.commands(cli)) {
    qa.execute();
}

