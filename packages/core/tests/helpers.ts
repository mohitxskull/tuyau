import { getActiveTest } from '@japa/runner'
import { Project, QuoteKind } from 'ts-morph'
import string from '@adonisjs/core/helpers/string'

export function getActiveTestContextOrThrow() {
  const test = getActiveTest()
  if (!test) throw new Error('Missing active test')

  return test.context
}

/**
 * Setup a new project with a tsconfig.json file
 */
export async function setupProject() {
  const { fs } = getActiveTestContextOrThrow()

  await fs.createJson('tsconfig.json', { include: ['**/*'] })
  await fs.createJson('package.json', {
    type: 'module',
    imports: { '#controllers/*': './app/controllers/*.js' },
  })

  return new Project({
    tsConfigFilePath: new URL('./tsconfig.json', fs.baseUrl).pathname,
    manipulationSettings: { quoteKind: QuoteKind.Single },
  })
}

/**
 * Create a new controller file with the given validator/return type
 */
export async function createController(options: {
  name: string
  returnType: string
  validator?: {
    path: string
    name: string
  }
}) {
  const { fs } = getActiveTestContextOrThrow()
  const path = `app/controllers/${string.snakeCase(options.name)}.ts`
  const validateUsing = options.validator
    ? `await request.validateUsing(${options.validator.name})`
    : ''

  const schemaImport = options.validator
    ? `import { ${options.validator.name} } from '../../${options.validator.path.replace('.ts', '.js')}'`
    : ''

  await fs.create(
    path,
    `${schemaImport}
    export default class ${options.name} {
      public async index() {
        ${validateUsing}
        return ${options.returnType}
      }
    }`,
  )

  return {
    pattern: `/${string.snakeCase(options.name.replace('Controller', ''))}`,
    methods: ['GET'],
    handler: {
      reference: `#controllers/${string.snakeCase(options.name)}.index`,
      handle: () => {},
    },
    domain: 'root',
  } as any
}

/**
 * Create a new validator file
 */
export async function createValidator(options: { name: string; schema: string }) {
  const { fs } = getActiveTestContextOrThrow()
  const path = `app/validators/${string.snakeCase(options.name)}.ts`

  await fs.create(
    path,
    `import vine from '@vinejs/vine'
    export const ${options.name} = vine.compile(vine.object(${options.schema}))`,
  )

  return { path, name: options.name }
}