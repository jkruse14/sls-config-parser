/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const { Config, _:{ getExplicitTokenRefs, getAccessCreds } } = require('../src')
const { join } = require('path')

describe('index', () => {
	describe('#_.getExplicitTokenRefs', () => {
		it('01 - Should parse a serverless.yml file to JSON.', () => {
			const tokenRefs = getExplicitTokenRefs({
				'service': 'graphql',
				'custom': {
					'stage': '${opt:stage, \'dev\'}',
					'dynamoDb': {
						'devProvisionedThroughput': {
							'ReadCapacityUnits': 1,
							'WriteCapacityUnits': 1
						},
						'prodProvisionedThroughput': {
							'ReadCapacityUnits': 2,
							'WriteCapacityUnits': 2
						}
					}
				},
				'provider': {
					'name': 'aws',
					'runtime': 'nodejs10.x',
					'region': 'ap-southeast-2',
					'profile': 'fairplay',
					'stage': '${self:custom.stage}'
				},
				'functions': {
					'graphql': {
						'handler': 'handler.handler',
						'events': [
							{
								'http': {
									'path': '/',
									'method': 'ANY'
								}
							}
						]
					}
				},
				'resources': {
					'Resources': {
						'UserTable': {
							'Type': 'AWS::DynamoDB::Table',
							'Properties': {
								'TableName': 'user_${self:provider.stage}',
								'AttributeDefinitions': [
									{
										'AttributeName': 'id',
										'AttributeType': 'N'
									},
									{
										'AttributeName': 'username',
										'AttributeType': 'S'
									},
									{
										'AttributeName': 'data',
										'AttributeType': 'M'
									}
								],
								'KeySchema': [
									{
										'AttributeName': 'id',
										'KeyType': 'N'
									}
								],
								'ProvisionedThroughput': '${self:custom.dynamodb.${self:provider.stage}ProvisionedThroughput}',
								'Tags': [
									{
										'Key': 'Type',
										'Value': 'test'
									},
									{
										'Key': 'Name',
										'Value': 'graphql'
									}
								]
							}
						}
					}
				}
			})

			assert.equal(tokenRefs.length, 4, '01')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'custom' && p[1] == 'stage').raw, '${opt:stage, \'dev\'}', '02')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'custom' && p[1] == 'stage').ref.opt.path[0], 'stage', '03')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'custom' && p[1] == 'stage').ref.opt.alt, 'dev', '04')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').raw, '${self:custom.stage}', '05')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').ref.self.path[0], 'custom', '06')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').ref.self.path[1], 'stage', '07')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').ref.self.alt, null, '08')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').raw, 'user_${self:provider.stage}', '09')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').ref.self.path[0], 'provider', '10')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').ref.self.path[1], 'stage', '11')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').ref.self.alt, null, '12')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').raw, '${self:custom.dynamodb.${self:provider.stage}ProvisionedThroughput}', '13')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').ref.self.path[0], 'provider', '14')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').ref.self.path[1], 'stage', '15')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').ref.self.alt, null, '16')
		})
	})
	describe('#_.getAccessCreds', () => {
		it('01 - Should extract the default keys.', () => {
			const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = getAccessCreds({ awsDir:join(__dirname,'./data/aws_01') })
			assert.equal(AWS_ACCESS_KEY_ID, 'AKBJKGWJKSWKH', '01')
			assert.equal(AWS_SECRET_ACCESS_KEY, 'cehwdhekw63289yeidqwjeiu23yi', '02')
			assert.equal(AWS_REGION, 'us-east-1', '03')
		})
		it('02 - Should extract the default keys even for weirdly formatted files.', () => {
			const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = getAccessCreds({ awsDir:join(__dirname,'./data/aws_02') })
			assert.equal(AWS_ACCESS_KEY_ID, 'AKBJKGWJKSWKH', '01')
			assert.equal(AWS_SECRET_ACCESS_KEY, 'cehwdhekw63289yeidqwjeiu23yi', '02')
			assert.equal(AWS_REGION, 'ap-southeast-2', '03')
		})
		it('03 - Should extract the a specific profile\'s keys.', () => {
			const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = getAccessCreds({ profile:'supercool', awsDir:join(__dirname,'./data/aws_03') })
			assert.equal(AWS_ACCESS_KEY_ID, 'SJKWHKSHSKLK', '01')
			assert.equal(AWS_SECRET_ACCESS_KEY, 'cdjwkhfdkewhuiwykhdkwe', '02')
			assert.equal(AWS_REGION, 'us-west-2', '03')
		})
		it('04 - Should extract the a specific profile\'s keys (weird format file 01).', () => {
			const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = getAccessCreds({ profile:'supercool', awsDir:join(__dirname,'./data/aws_04') })
			assert.equal(AWS_ACCESS_KEY_ID, 'SJKWHKSHSKLK', '01')
			assert.equal(AWS_SECRET_ACCESS_KEY, 'cdjwkhfdkewhuiwykhdkwe', '02')
			assert.equal(AWS_REGION, 'us-west-2', '03')
		})
		it('05 - Should extract the a specific profile\'s keys (weird format file 02).', () => {
			const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = getAccessCreds({ profile:'helloworld', awsDir:join(__dirname,'./data/aws_05') })
			assert.equal(AWS_ACCESS_KEY_ID, 'JWUIBJKBUWGGJGJUGUJG', '01')
			assert.equal(AWS_SECRET_ACCESS_KEY, 'dhejkwhdiuewhdjkhdegwfugewf', '02')
			assert.equal(AWS_REGION, 'us-east-1', '03')
		})
	})
	describe('#Config.config()', () => {
		it('01 - Should parse a serverless.yml file to JSON.', () => {
			process.env.FUNC_PREFIX = 'hello'
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath })
			const config = cfg.config()
			const { service, functions, provider } = config || {}
			assert.equal(service, 'graphql', '01')
			assert.equal(functions.graphql.handler, 'handler.handler', '03')
			assert.equal(functions.graphql.events[0].http.path, '/', '04')
			assert.equal(functions.graphql.events[0].http.method, 'ANY', '05')
			assert.equal(provider.funcPrefix, 'func-hello', '06')
		})

		it('02 - Should resolve the dynamic variables using the default settings inside the serverless.yml file.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath, stage:null })
			const config = cfg.config()
			const { custom, provider, resources } = config || {}
			assert.equal(custom.stage, 'dev', '01')
			assert.equal(provider.stage, 'dev', '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_dev', '03')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 1, '04')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 1, '05')
		})
		
		it('03 - Should resolve the dynamic variables inside the serverless.yml file.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath, stage:'prod' })
			const config = cfg.config()
			const { custom, provider, resources } = config || {}
			assert.equal(custom.stage, 'prod', '01')
			assert.equal(provider.stage, 'prod', '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_prod', '03')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 2, '04')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 2, '05')
		})
		
		it('04 - Should support the \'file\' function (BASIC TEST).', () => {
			const ymlPath = join(__dirname, './data/serverless_02.yml')
			const cfg = new Config({ _path:ymlPath, stage:'prod' })
			const config = cfg.config()
			const { custom, resources } = config || {}
			assert.equal(custom.stage, 'prod', '01')
			assert.equal(custom.config.dev.dynamoDB.ProvisionedThroughput.ReadCapacityUnits, 1, '02')
			assert.equal(custom.config.prod.dynamoDB.ProvisionedThroughput.ReadCapacityUnits, 2, '03')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_prod', '04')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions.length, 3, '05')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[0].AttributeName, 'id', '06')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[1].AttributeName, 'username', '07')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[2].AttributeName, 'data', '08')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 2, '09')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 2, '10')
		})
		
		it('05 - Should support the \'file\' function (INTERMEDIATE TEST WITH NESTED VARIABLES).', () => {
			const ymlPath = join(__dirname, './data/serverless_03.yml')
			let cfg = new Config({ _path:ymlPath, stage:'prod' })
			let config = cfg.config()
			let { custom, resources, provider } = config || {}

			assert.equal(custom.stage, 'prod', '01-A')
			assert.equal(provider.profile, 'fairplay', '01-B')
			assert.equal(custom.config.dynamoDB.ProvisionedThroughput.ReadCapacityUnits, 2, '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_prod', '03')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions.length, 4, '04')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[0].AttributeName, 'id', '05')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[1].AttributeName, 'username', '06')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[2].AttributeName, 'data', '07')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[3].AttributeName, 'log', '08')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 2, '09')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 2, '10')

			cfg = new Config({ _path:ymlPath })
			config = cfg.config()
			custom = (config || {}).custom
			resources = (config || {}).resources
			assert.equal(custom.stage, 'dev', '11')
			assert.equal(custom.config.dynamoDB.ProvisionedThroughput.ReadCapacityUnits, 1, '12')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_dev', '13')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions.length, 3, '14')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[0].AttributeName, 'id', '15')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[1].AttributeName, 'username', '16')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[2].AttributeName, 'data', '17')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 1, '18')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 1, '19')
		})

		it('06 - Should support overriding the serverless file.', () => {
			const ymlPath = join(__dirname, './data/serverless_03.yml')
			let cfg = new Config({ _path:ymlPath, stage:'prod', _force:'provider.profile=neap' })
			let config = cfg.config()
			let { custom, resources, provider } = config || {}

			assert.equal(custom.stage, 'prod', '01-A')
			assert.equal(provider.profile, 'neap', '01-B')
			assert.equal(custom.config.dynamoDB.ProvisionedThroughput.ReadCapacityUnits, 2, '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_prod', '03')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions.length, 4, '04')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[0].AttributeName, 'id', '05')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[1].AttributeName, 'username', '06')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[2].AttributeName, 'data', '07')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[3].AttributeName, 'log', '08')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 2, '09')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 2, '10')

			cfg = new Config({ _path:ymlPath, _force:'provider.profile=neap;resources.Resources.UserTable.Properties.TableName=hello' })
			config = cfg.config()
			custom = (config || {}).custom
			resources = (config || {}).resources
			provider = (config || {}).provider
			assert.equal(custom.stage, 'dev', '11-A')
			assert.equal(provider.profile, 'neap', '11-B')
			assert.equal(custom.config.dynamoDB.ProvisionedThroughput.ReadCapacityUnits, 1, '12')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'hello', '13')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions.length, 3, '14')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[0].AttributeName, 'id', '15')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[1].AttributeName, 'username', '16')
			assert.equal(resources.Resources.UserTable.Properties.AttributeDefinitions[2].AttributeName, 'data', '17')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 1, '18')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 1, '19')
		})
		
		// it('06 - Should support ...', done => { co(function *(){
		// 	const ymlPath = join(__dirname, './data/serverless_04.yml')
		// 	let cfg = new Config({ _path:ymlPath, stage:'dev' })
		// 	let config = yield cfg.config()
		// 	console.log(config)
		// 	done()
		// }).catch(done)})
	})
	describe('#Config.env()', () => {
		it('01 - Should get all environment variables from the YAML file.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath })
			const env = cfg.env()
			assert.equal(env.DATA_01, 'hello dev', '01')
			assert.equal(env.DATA_02, 'boom boom', '02')
			assert.equal(env.GRAPHQL_ENV_01, 'graphql_01', '03')
			assert.equal(env.GRAPHQL_ENV_02, 'graphql_02', '04')
			assert.equal(env.REST_ENV_01, 'rest_01', '05')
			assert.equal(env.REST_ENV_02, 'rest_02', '06')
		})

		it('02 - Should support selecting specific functions.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath, stage:'prod' })
			const env = cfg.env({ functions:['graphql'] })
			assert.equal(env.DATA_01, 'hello prod', '01')
			assert.equal(env.DATA_02, 'boom boom', '02')
			assert.equal(env.GRAPHQL_ENV_01, 'graphql_01', '03')
			assert.equal(env.GRAPHQL_ENV_02, 'graphql_02', '04')
			assert.isNotOk(env.REST_ENV_01, '05')
			assert.isNotOk(env.REST_ENV_02, '06')
		})

		it('03 - Should support focusing on global variables only.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath, stage:'prod' })
			const env = cfg.env({ ignoreFunctions:true })
			assert.equal(env.DATA_01, 'hello prod', '01')
			assert.equal(env.DATA_02, 'boom boom', '02')
			assert.isNotOk(env.GRAPHQL_ENV_01, '03')
			assert.isNotOk(env.GRAPHQL_ENV_02, '04')
			assert.isNotOk(env.REST_ENV_01, '05')
			assert.isNotOk(env.REST_ENV_02, '06')
		})

		it('04 - Should support focusing on functions variables only.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath })
			const env = cfg.env({ ignoreGlobal:true })
			assert.isNotOk(env.DATA_01, '01')
			assert.isNotOk(env.DATA_02, '02')
			assert.equal(env.GRAPHQL_ENV_01, 'graphql_01', '03')
			assert.equal(env.GRAPHQL_ENV_02, 'graphql_02', '04')
			assert.equal(env.REST_ENV_01, 'rest_01', '05')
			assert.equal(env.REST_ENV_02, 'rest_02', '06')
		})

		it('05 - Should support including the access key and secret.', () => {
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const cfg = new Config({ _path:ymlPath })
			const env = cfg.env({ inclAccessCreds:true, awsDir:join(__dirname, './data/aws_05') })
			assert.equal(env.DATA_01, 'hello dev', '01')
			assert.equal(env.DATA_02, 'boom boom', '02')
			assert.equal(env.GRAPHQL_ENV_01, 'graphql_01', '03')
			assert.equal(env.GRAPHQL_ENV_02, 'graphql_02', '04')
			assert.equal(env.REST_ENV_01, 'rest_01', '05')
			assert.equal(env.REST_ENV_02, 'rest_02', '06')
			assert.equal(env.AWS_ACCESS_KEY_ID, 'JWUIBJKBUWGGJGJUGUJG', '07')
			assert.equal(env.AWS_SECRET_ACCESS_KEY, 'dhejkwhdiuewhdjkhdegwfugewf', '08')
		})

		it('06 - Should use the provider.region to overide the region defined in the .aws/config file.', () => {
			const ymlPath = join(__dirname, './data/serverless_02.yml')
			const cfg = new Config({ _path:ymlPath })
			const env = cfg.env({ inclAccessCreds:true, awsDir:join(__dirname, './data/aws_05'), format:'array' })
			assert.equal(env.find(({ name }) => name == 'AWS_ACCESS_KEY_ID').value, 'JWUIBJKBUWGGJGJUGUJG', '07')
			assert.equal(env.find(({ name }) => name == 'AWS_SECRET_ACCESS_KEY').value, 'dhejkwhdiuewhdjkhdegwfugewf', '08')
			assert.equal(env.find(({ name }) => name == 'AWS_REGION').value, 'ap-southeast-2', '09')
		})

		it('07 - Should support overriding the AWS_REGION environment variable using the \'_force\' option.', () => {
			const ymlPath = join(__dirname, './data/serverless_02.yml')
			const cfg = new Config({ _path:ymlPath, _force: 'provider.region=hello' })
			const env = cfg.env({ inclAccessCreds:true, awsDir:join(__dirname, './data/aws_05'), format:'array' })
			assert.equal(env.find(({ name }) => name == 'AWS_ACCESS_KEY_ID').value, 'JWUIBJKBUWGGJGJUGUJG', '07')
			assert.equal(env.find(({ name }) => name == 'AWS_SECRET_ACCESS_KEY').value, 'dhejkwhdiuewhdjkhdegwfugewf', '08')
			assert.equal(env.find(({ name }) => name == 'AWS_REGION').value, 'hello', '09')
		})

		it('08 - Should support overriding environment variables that rely on custom variable that have been forced with the \'_force\' option.', () => {
			const ymlPath = join(__dirname, './data/serverless_05.yml')
			const customUrl = 'http://super.com'
			const cfg = new Config({ _path:ymlPath, _force: `custom.messageUrl.dev=${customUrl}` })
			const env = cfg.env()
			assert.equal(env.MSG_URL, customUrl, '01')
		})
	})
})









