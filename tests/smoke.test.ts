import { describe, expect, it } from 'vitest'

describe('Harnais Vitest', () => {
  it('s’exécute dans un environnement Node, sans Electron', () => {
    expect(typeof process).toBe('object')
  })

  it('exécute un test de fumée', () => {
    expect(2 + 2).toBe(4)
  })
})
