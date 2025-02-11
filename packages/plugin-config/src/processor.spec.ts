// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { mkdir, readFile } from 'fs/promises'
import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import temp from 'temp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { BuildOptions, UserConfig } from '@sdeverywhere/build'
import { build } from '@sdeverywhere/build'

import type { ConfigOptions } from './processor'
import { configProcessor } from './processor'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface TestEnv {
  projDir: string
  corePkgDir: string
  buildOptions: BuildOptions
}

async function prepareForBuild(optionsFunc: (corePkgDir: string) => ConfigOptions): Promise<TestEnv> {
  const baseTmpDir = await temp.mkdir('sde-plugin-config')
  const projDir = joinPath(baseTmpDir, 'proj')
  await mkdir(projDir)
  const corePkgDir = joinPath(projDir, 'core-package')
  await mkdir(corePkgDir)

  const config: UserConfig = {
    rootDir: projDir,
    modelFiles: [],
    modelSpec: configProcessor(optionsFunc(corePkgDir))
  }

  const buildOptions: BuildOptions = {
    config,
    //logLevels: ['info'],
    logLevels: [],
    sdeDir: '',
    sdeCmdPath: ''
  }

  return {
    projDir,
    corePkgDir,
    buildOptions
  }
}

const specJson1 = `\
{
  "inputVarNames": [
    "Input A",
    "Input B",
    "Input C"
  ],
  "outputVarNames": [
    "Var 1"
  ],
  "externalDatfiles": [
    "../Data1.dat",
    "../Data2.dat"
  ]
}\
`

const modelSpec1 = `\
// This file is generated by \`@sdeverywhere/plugin-config\`; do not edit manually!
export const inputVarIds: string[] = [
  "_input_a",
  "_input_b",
  "_input_c"
]
export const outputVarIds: string[] = [
  "_var_1"
]
`

const configSpecs1 = `\
// This file is generated by \`@sdeverywhere/plugin-config\`; do not edit manually!

import type { GraphSpec, InputSpec } from './spec-types'

export const graphSpecs: GraphSpec[] = [
  {
    "id": "1",
    "kind": "line",
    "titleKey": "graph_001_title",
    "xMin": 50,
    "xMax": 100,
    "xAxisLabelKey": "graph_xaxis_label__x_axis",
    "yMin": 0,
    "yMax": 300,
    "yAxisLabelKey": "graph_yaxis_label__y_axis",
    "yFormat": ".0f",
    "datasets": [
      {
        "varId": "_var_1",
        "varName": "Var 1",
        "externalSourceName": "Ref",
        "labelKey": "graph_dataset_label__baseline",
        "color": "#000000",
        "lineStyle": "line"
      },
      {
        "varId": "_var_1",
        "varName": "Var 1",
        "labelKey": "graph_dataset_label__current_scenario",
        "color": "#0000ff",
        "lineStyle": "line"
      }
    ],
    "legendItems": [
      {
        "color": "#000000",
        "labelKey": "graph_dataset_label__baseline"
      },
      {
        "color": "#0000ff",
        "labelKey": "graph_dataset_label__current_scenario"
      }
    ]
  }
]

export const inputSpecs: InputSpec[] = [
  {
    "kind": "slider",
    "id": "1",
    "varId": "_input_a",
    "varName": "Input A",
    "defaultValue": 0,
    "minValue": -50,
    "maxValue": 50,
    "step": 1,
    "reversed": false,
    "labelKey": "input_001_label",
    "descriptionKey": "input_001_description",
    "unitsKey": "input_units__pct",
    "rangeLabelKeys": [],
    "rangeDividers": [],
    "format": ".0f"
  },
  {
    "kind": "slider",
    "id": "2",
    "varId": "_input_b",
    "varName": "Input B",
    "defaultValue": 0,
    "minValue": -50,
    "maxValue": 50,
    "step": 1,
    "reversed": false,
    "labelKey": "input_002_label",
    "descriptionKey": "input_002_description",
    "unitsKey": "input_units__pct",
    "rangeLabelKeys": [],
    "rangeDividers": [],
    "format": ".0f"
  },
  {
    "kind": "switch",
    "id": "3",
    "varId": "_input_c",
    "varName": "Input C",
    "labelKey": "input_003_label",
    "defaultValue": 0,
    "offValue": 0,
    "onValue": 1,
    "slidersActiveWhenOff": [],
    "slidersActiveWhenOn": []
  }
]
`

const enStrings1 = `\
export default {
  "__string_1": "String 1",
  "__string_2": "String 2",
  "graph_001_title": "Graph 1 Title",
  "graph_dataset_label__baseline": "Baseline",
  "graph_dataset_label__current_scenario": "Current Scenario",
  "graph_xaxis_label__x_axis": "X-Axis",
  "graph_yaxis_label__y_axis": "Y-Axis",
  "input_001_description": "This is a description of Slider A",
  "input_001_label": "Slider A Label",
  "input_002_description": "This is a description of Slider B",
  "input_002_label": "Slider B Label",
  "input_003_label": "Switch C Label",
  "input_group_title__input_group_1": "Input Group 1",
  "input_units__pct": "%"
}`

describe('configProcessor', () => {
  beforeAll(() => {
    temp.track()
  })

  afterAll(() => {
    temp.cleanupSync()
  })

  it('should throw an error if the config directory does not exist', async () => {
    const configDir = '/___does-not-exist___'
    const testEnv = await prepareForBuild(() => ({
      config: configDir
    }))
    const result = await build('production', testEnv.buildOptions)
    if (result.isOk()) {
      throw new Error('Expected err result but got ok: ' + result.value)
    }
    expect(result.error.message).toBe(`The provided config dir '/___does-not-exist___' does not exist`)
  })

  it('should write to default directory structure if single out dir is provided', async () => {
    const configDir = joinPath(__dirname, '__tests__', 'config1')
    const testEnv = await prepareForBuild(corePkgDir => ({
      config: configDir,
      out: corePkgDir
    }))
    const result = await build('production', testEnv.buildOptions)
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }

    const specJsonFile = joinPath(testEnv.projDir, 'sde-prep', 'spec.json')
    expect(await readFile(specJsonFile, 'utf8')).toEqual(specJson1)

    const modelSpecFile = joinPath(testEnv.corePkgDir, 'src', 'model', 'generated', 'model-spec.ts')
    expect(await readFile(modelSpecFile, 'utf8')).toEqual(modelSpec1)

    const configSpecsFile = joinPath(testEnv.corePkgDir, 'src', 'config', 'generated', 'config-specs.ts')
    expect(await readFile(configSpecsFile, 'utf8')).toEqual(configSpecs1)

    const specTypesFile = joinPath(testEnv.corePkgDir, 'src', 'config', 'generated', 'spec-types.ts')
    expect(existsSync(specTypesFile)).toBe(true)

    const enStringsFile = joinPath(testEnv.corePkgDir, 'strings', 'en.js')
    expect(await readFile(enStringsFile, 'utf8')).toEqual(enStrings1)
  })

  it('should write to given directories if out paths are provided', async () => {
    const configDir = joinPath(__dirname, '__tests__', 'config1')
    const testEnv = await prepareForBuild(corePkgDir => ({
      config: configDir,
      out: {
        modelSpecsDir: joinPath(corePkgDir, 'mgen'),
        configSpecsDir: joinPath(corePkgDir, 'cgen'),
        stringsDir: joinPath(corePkgDir, 'sgen')
      }
    }))
    const result = await build('production', testEnv.buildOptions)
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }

    const specJsonFile = joinPath(testEnv.projDir, 'sde-prep', 'spec.json')
    expect(await readFile(specJsonFile, 'utf8')).toEqual(specJson1)

    const modelSpecFile = joinPath(testEnv.corePkgDir, 'mgen', 'model-spec.ts')
    expect(await readFile(modelSpecFile, 'utf8')).toEqual(modelSpec1)

    const configSpecsFile = joinPath(testEnv.corePkgDir, 'cgen', 'config-specs.ts')
    expect(await readFile(configSpecsFile, 'utf8')).toEqual(configSpecs1)

    const specTypesFile = joinPath(testEnv.corePkgDir, 'cgen', 'spec-types.ts')
    expect(existsSync(specTypesFile)).toBe(true)

    const enStringsFile = joinPath(testEnv.corePkgDir, 'sgen', 'en.js')
    expect(await readFile(enStringsFile, 'utf8')).toEqual(enStrings1)
  })
})
