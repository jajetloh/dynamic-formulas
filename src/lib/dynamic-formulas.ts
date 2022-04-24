export interface Equation {
    name: string
    variables: string[]
    equations: { [varName: string]: (x: any) => number }
}

interface SolverWarning {
    type: string
    message: string
}

export interface SolverVariable {
    checkDisabled: boolean
    checkValue: boolean
    fieldDisabled: boolean
    fieldValue: number | null
}

export interface SolverResult {
    variables: { [k: string]: SolverVariable }
    warnings: SolverWarning[]
}

export class DynamicFormulaSolver {

    public constructor(
        private readonly variables: string[],
        private readonly equations: Equation[],
        private readonly degreesOfFreedom: number,
    ) {
        this.validateInputs()
    }

    private validateInputs() { }

    public refreshNumbers(lockedValues: { [k: string]: number }, lastChanged?: [string, number]): SolverResult {
        let results = solveEquations(this.equations, lockedValues)

        const valuesForcedByLockValues = Object.entries(results)
            .filter(([k, _]) => !(k in lockedValues))
            .reduce((acc, [k, v]: [string, number]) => { acc[k] = v; return acc }, {} as { [k: string]: number })

        if (lastChanged) {
            const [changedVar, changedValue] = lastChanged
            results = solveEquations(this.equations, { ...results, [changedVar]: changedValue })
        }

        const forcedValuesAll = Object.entries(results)
            .filter(([k, _]) => !(k in lockedValues))
            .reduce((acc, [k, v]: [string, number]) => { acc[k] = v; return acc }, {} as { [k: string]: number })

        const maxLocksReached = Object.keys(lockedValues).length >= this.degreesOfFreedom - 1

        return {
            variables: this.variables.map(v => [
                v,
                {
                    checkValue: v in lockedValues,
                    checkDisabled: v in valuesForcedByLockValues || (maxLocksReached && !(v in lockedValues)),
                    fieldValue: forcedValuesAll[v] ?? (lockedValues[v] ?? null),
                    fieldDisabled: v in valuesForcedByLockValues,
                } as SolverVariable
            ]).reduce((acc, [k, v]: [string, SolverVariable]) => { acc[k] = v; return acc }, {}),
            warnings: [] as SolverWarning[],
        } as SolverResult
    }
}

export function solveEquations(equations: Equation[], inputs: { [k: string]: number }, maxDepth: number = 50): { [k: string]: number } {
    const results = { ...inputs }
    let previousKnownCount = -1
    let knownCount = Object.keys(results).length
    let counter = 0
    while (counter < maxDepth) {
        previousKnownCount = knownCount
        equations.forEach(eqn => {
            const unknowns = eqn.variables.filter((v: string) => !(v in results))
            if (unknowns.length === 1) {
                const vNew: string = unknowns[0]
                results[vNew] = (eqn as any).equations[vNew](results)
            }
        })
        knownCount = Object.keys(results).length
        if (previousKnownCount == knownCount) break
        counter++
    }
    return results
}
