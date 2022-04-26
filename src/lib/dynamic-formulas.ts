export interface Equation {
    name: string
    variables: string[]
    eqArrangements: { [varName: string]: (x: any) => number }
    auxiliary?: boolean
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
                results[vNew] = eqn.eqArrangements[vNew](results)
            }
        })
        knownCount = Object.keys(results).length
        if (previousKnownCount == knownCount) break
        counter++
    }
    return results
}

export interface EquationValidationResult {
    isValid: boolean,
    badVariableCombinations: string[][],
    equations: {
        name: string,
        variables: string[],
        variablesInArrangementsValid: boolean,
        eqArrangement: { [k: string]: number },
        eqArrangementsValid: { [k: string]: boolean },
    }[]
}

export function validateEquations(variables: string[], equations: Equation[], inputs: { [k: string]: number }): EquationValidationResult {
    const equationResults: EquationValidationResult = {
        isValid: false,
        badVariableCombinations: [],
        equations: [],
    }
    const coreEquations: Equation[] = equations.filter(x => !x.auxiliary)
    const degreesOfFreedom = variables.length - coreEquations.length
    equations.forEach(eqn => {
        const [valuesFromEquations, correctValues]: [{ [k: string]: number }, { [k: string]: boolean }] = eqn.variables.map(k => [k, eqn.eqArrangements[k]]).reduce((acc, [k, fn]: [string, (x: any) => number]) => {
            const filteredInputs = Object.entries(inputs).filter(([k, _]) => eqn.variables.includes(k)).reduce((acc, [k, v]) => { acc[k] = v; return acc }, {})
            acc[0][k] = fn(filteredInputs)
            acc[1][k] = Math.abs(acc[0][k] - inputs[k]) <= 1e-5
            return acc
        }, [{}, {}])
        const variablesInArrangementsValid = Object.keys(eqn.eqArrangements).every(k => eqn.variables.includes(k))
        equationResults.equations.push({
            name: eqn.name,
            variables: eqn.variables,
            variablesInArrangementsValid,
            eqArrangement: valuesFromEquations,
            eqArrangementsValid: correctValues,
        })
    })


    for (const combination of generateCombinations(variables, degreesOfFreedom)) {
        const knowns = [...combination]
        let previousKnownCount = -1
        let isOverconstrained = false
        const coreEquationVars: string[][] = coreEquations.map(eqn => eqn.variables)

        // Check if this set of variables in 'combination' overconstrains the equation
        while (previousKnownCount !== knowns.length && !isOverconstrained) {
            previousKnownCount = knowns.length
            coreEquationVars.forEach((eqnVars, i, a) => {
                const eqnUnknowns = eqnVars.filter(v => !knowns.includes(v))
                if (eqnUnknowns.length === 1) {
                    knowns.push(eqnUnknowns[0])
                    a.splice(i, 1)
                } else if (eqnUnknowns.length === 0) {
                    isOverconstrained = true
                }
            })
        }

        if (isOverconstrained) continue

        // If not overconstrained, check to see if it can be solved
        const knowns2 = [...combination]
        let previousKnownCount2 = -1
        while (previousKnownCount2 !== knowns2.length) {
            previousKnownCount2 = knowns2.length
            equations.forEach(eqn => {
                const eqnUnknowns = eqn.variables.filter(v => !knowns2.includes(v))
                if (eqnUnknowns.length === 1) knowns2.push(eqnUnknowns[0])
            })
        }

        if (knowns2.length < variables.length) equationResults.badVariableCombinations.push([...combination])
    }

    if (equationResults.equations.every(eqnResult => Object.values(eqnResult.eqArrangementsValid).every(x => x) && eqnResult.variablesInArrangementsValid)
        && equationResults.badVariableCombinations.length === 0) {
        equationResults.isValid = true
    }

    return equationResults
}

// From https://stackoverflow.com/a/61418166
function generateCombinations(sourceArray, comboLength) {
    const sourceLength = sourceArray.length;
    if (comboLength > sourceLength) return [];

    const combos = []; // Stores valid combinations as they are generated.

    // Accepts a partial combination, an index into sourceArray, 
    // and the number of elements required to be added to create a full-length combination.
    // Called recursively to build combinations, adding subsequent elements at each call depth.
    const makeNextCombos = (workingCombo, currentIndex, remainingCount) => {
        const oneAwayFromComboLength = remainingCount == 1;

        // For each element that remaines to be added to the working combination.
        for (let sourceIndex = currentIndex; sourceIndex < sourceLength; sourceIndex++) {
            // Get next (possibly partial) combination.
            const next = [...workingCombo, sourceArray[sourceIndex]];

            if (oneAwayFromComboLength) {
                // Combo of right length found, save it.
                combos.push(next);
            }
            else {
                // Otherwise go deeper to add more elements to the current partial combination.
                makeNextCombos(next, sourceIndex + 1, remainingCount - 1);
            }
        }
    }

    makeNextCombos([], 0, comboLength);
    return combos;
}
