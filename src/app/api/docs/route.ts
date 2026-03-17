import { ApiReference } from '@scalar/nextjs-api-reference'
import fs from 'fs'
import path from 'path'

const openapiSpec = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'openapi.json'), 'utf-8')
)

export const GET = ApiReference(openapiSpec as any)
