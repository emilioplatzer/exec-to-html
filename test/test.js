"use strict";

var _ = require('lodash');
var stream = require('stream');
var expect = require('expect.js');
var execToHtml = require('..');
var Path = require('path');
var fixtures = require('./fixtures.js');

var stream = require('stream');
var util = require('util');
var os = require('os');

describe('exec-to-html', function(){
    describe('internal streams', function(){
        it('first simple test', function(done){
            var obtainedLines=[];
            execToHtml.run('!echo hi5',{echo:false}).onLine(function(lineInfo){
                obtainedLines.push(lineInfo);
            }).then(function(exitCode){
                expect(obtainedLines).to.eql([{origin:'stdout', text:'hi5'+os.EOL}]);
                expect(exitCode).to.be(0);
                done();
            }).catch(done);
        });
        it('should register commands from a local-config.yaml (#14)', function(done){
            var here=process.cwd();
            process.chdir('./test');
            var expCmds =  _.cloneDeep(execToHtml.commands);
            expCmds['diskspace'] = {
               win: 'dir|find "dirs"', unix: 'df -h --total | grep total', shell: true
            };
            expCmds['listar'] = { win: 'dir/b', unix: 'ls', shell: true };
            execToHtml.addLocalCommands(execToHtml.commands).then(function(commands) {
                expect(commands).to.eql(expCmds);
                process.chdir(here);
                done();
            }).catch(done);
        });
        it('could run commands from a local-config.yaml (#14)', function(done){
            var obtainedLines=[];
            var here=process.cwd();
            process.chdir('./test');
            execToHtml.run('listar *fixtures.js',{echo:false}).onLine(function(lineInfo){
                obtainedLines.push(lineInfo);
            }).then(function(exitCode){
                expect(obtainedLines).to.eql([{origin:'stdout', text:'fixtures.js'+os.EOL}]);
                expect(exitCode).to.be(0);
                process.chdir(here);
                done();
            }).catch(done);
        });
        _.forEach(fixtures,function(fixture){
            if(fixture.skipped){
                it.skip('run fixture with stream. For fixutreName='+fixture.name+', skipped:'+fixture.skipped,function(){
                });
                return;
            }
            it('run fixture with stream. For fixutreName='+fixture.name,function(done){
                if(fixture.timeout){
                    this.timeout(fixture.timeout*(process.env.APPVEYOR?3:1));
                }
                var expectedLines=fixture.expected.slice(0);
                var obtainedLines=[];
                execToHtml.run(fixture.commands,fixture.opts).onLine(function(lineInfo){
                    obtainedLines.push(lineInfo);
                }).then(function(exitCode){
                    if(fixture.slice) {
                        obtainedLines = obtainedLines.slice(fixture.slice[0], fixture.slice[1]);
                    }
                    //console.log("OL", obtainedLines); console.log("EX", fixture.expected);
                    expect(obtainedLines).to.eql(fixture.expected);
                    //console.log("exitCode",exitCode);
                    expect(exitCode).to.eql(fixture.exit||0);
                    done();
                }).catch(done);
            });
            if(fixture.collect){
                it('run fixture with collect. For fixutreName='+fixture.name,function(done){
                    var opts=_.clone(fixture.opts||{});
                    opts.collect=true;
                    execToHtml.run(fixture.commands,opts).then(function(result){
                        expect(result).to.eql(fixture.collect);
                        done();
                    }).catch(done);
                });
            };
        });
    });
    describe('internal streams error control', function(){
        it('must pass opts',function(done){
            execToHtml.run('!echo 1').onLine(function(){
                throw new Error('Unexpected data');
            }).then(function(){
                throw new Error('Reject expected');
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.message).to.match(/option echo is mandatory/);
                done();
            }).catch(done);
        });
    });
});
