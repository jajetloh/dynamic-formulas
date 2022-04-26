import test from 'ava'

import { solveEquations, DynamicFormulaSolver, Equation, SolverVariable, validateEquations, EquationValidationResult } from './dynamic-formulas'

const TEST_VARIABLES = ['a', 'b', 'c', 'd', 'e', 'f']

const TEST_EQUATIONS: Equation[] = [
    {
        name: 'a=b+c+d',
        variables: ['a', 'b', 'c', 'd'],
        eqArrangements: {
            a: x => x.b + x.c + x.d,
            b: x => x.a - x.c - x.d,
            c: x => x.a - x.b - x.d,
            d: x => x.a - x.b - x.c,
        },
    },
    {
        name: 'a=e*f',
        variables: ['a', 'e', 'f'],
        eqArrangements: {
            a: x => x.e * x.f,
            e: x => x.a / x.f,
            f: x => x.a / x.e,
        },
    },
]

test('solveEquations', (t) => {
    const equations: Equation[] = TEST_EQUATIONS
    const inputs = {
        e: 3,
        f: 5,
        b: 2,
        c: 6,
    }
    const result = solveEquations(equations, inputs)
    const expectedResult = {
        a: 15,
        b: 2,
        c: 6,
        d: 7,
        e: 3,
        f: 5,
    }
    t.deepEqual(result, expectedResult)
})

test('DynamicFormulaSolver', (t) => {
    const solver = new DynamicFormulaSolver(
        ['a', 'b', 'c', 'd', 'e', 'f'],
        TEST_EQUATIONS,
        4,
    )

    const result = solver.refreshNumbers({
        e: 3,
        f: 5,
        b: 2,
    }, ['c', 6])

    const expectedVariables: { [k: string]: SolverVariable } = {
        a: {
            checkValue: false,
            checkDisabled: true,
            fieldValue: 15,
            fieldDisabled: true,
        },
        b: {
            checkValue: true,
            checkDisabled: false,
            fieldValue: 2,
            fieldDisabled: false,
        },
        c: {
            checkValue: false,
            checkDisabled: true,
            fieldValue: 6,
            fieldDisabled: false,
        },
        d: {
            checkValue: false,
            checkDisabled: true,
            fieldValue: 7,
            fieldDisabled: false,
        },
        e: {
            checkValue: true,
            checkDisabled: false,
            fieldValue: 3,
            fieldDisabled: false,
        },
        f: {
            checkValue: true,
            checkDisabled: false,
            fieldValue: 5,
            fieldDisabled: false,
        },
    }

    t.deepEqual(result.variables, expectedVariables)
})

test('validateEquations should detect when equations are consistent for a set of given inputs', (t) => {
    const equations: Equation[] = TEST_EQUATIONS
    const variables = TEST_VARIABLES
    const inputs = {
        a: 15,
        b: 2,
        c: 6,
        d: 7,
        e: 3,
        f: 5,
    }

    const result = validateEquations(variables, equations, inputs)

    const expectedResult: EquationValidationResult = {
        isValid: true,
        badVariableCombinations: [],
        equations: [
            {
                name: 'a=b+c+d',
                variables: ['a', 'b', 'c', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, b: 2, c: 6, d: 7 },
                eqArrangementsValid: { a: true, b: true, c: true, d: true },
            },
            {
                name: 'a=e*f',
                variables: ['a', 'e', 'f'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, e: 3, f: 5 },
                eqArrangementsValid: { a: true, e: true, f: true },
            },
        ]
    }
    t.deepEqual(result, expectedResult)
})

const TEST_EQUATIONS_BAD: Equation[] = [
    {
        name: 'a=b+c+d',
        variables: ['a', 'b', 'c', 'd'],
        eqArrangements: {
            a: x => x.b + x.c + x.d,
            b: x => x.a - x.c - x.d,
            c: x => x.a - x.b - x.d + 1,
            d: x => x.a - x.b - x.c,
        },
    },
    {
        name: 'a=e*f',
        variables: ['a', 'e', 'f'],
        eqArrangements: {
            a: x => x.e * x.f,
            e: x => x.a / x.f,
            f: x => x.a / x.e,
        },
    },
]

test('validateEquations should detect when equations are inconsistent for a given set of inputs, and note which equation/s are inconsistent', (t) => {
    const equations: Equation[] = TEST_EQUATIONS_BAD
    const variables = TEST_VARIABLES
    const inputs = {
        a: 15,
        b: 2,
        c: 6,
        d: 7,
        e: 3,
        f: 5,
    }

    const result = validateEquations(variables, equations, inputs)

    const expectedResult: EquationValidationResult = {
        isValid: false,
        badVariableCombinations: [],
        equations: [
            {
                name: 'a=b+c+d',
                variables: ['a', 'b', 'c', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, b: 2, c: 7, d: 7 },
                eqArrangementsValid: { a: true, b: true, c: false, d: true },
            },
            {
                name: 'a=e*f',
                variables: ['a', 'e', 'f'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, e: 3, f: 5 },
                eqArrangementsValid: { a: true, e: true, f: true },
            },
        ]
    }
    t.deepEqual(result, expectedResult)
})

test('validateEquations should return saying the result is not valid when the input values are consistent', (t) => {
    const equations: Equation[] = TEST_EQUATIONS
    const variables = TEST_VARIABLES
    const inputs = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }
    const result = validateEquations(variables, equations, inputs)

    const expectedResult: EquationValidationResult = {
        isValid: false,
        badVariableCombinations: [],
        equations: [
            {
                name: 'a=b+c+d',
                variables: ['a', 'b', 'c', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 9, b: -6, c: -5, d: -4 },
                eqArrangementsValid: { a: false, b: false, c: false, d: false },
            },
            {
                name: 'a=e*f',
                variables: ['a', 'e', 'f'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 30, e: 1 / 6, f: 1 / 5 },
                eqArrangementsValid: { a: false, e: false, f: false },
            },
        ]
    }
    t.deepEqual(result, expectedResult)
})

test('validateEquations should return valid for values generated by solveEquations when equations are consistent', (t) => {
    const initialInputs = { e: 3, f: 5, b: 2, c: 6 }
    const variables = TEST_VARIABLES
    const resultValues = solveEquations(TEST_EQUATIONS, initialInputs)
    const result = validateEquations(variables, TEST_EQUATIONS, resultValues)

    const expectedResult: EquationValidationResult = {
        isValid: true,
        badVariableCombinations: [],
        equations: [
            {
                name: 'a=b+c+d',
                variables: ['a', 'b', 'c', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, b: 2, c: 6, d: 7 },
                eqArrangementsValid: { a: true, b: true, c: true, d: true },
            },
            {
                name: 'a=e*f',
                variables: ['a', 'e', 'f'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, e: 3, f: 5 },
                eqArrangementsValid: { a: true, e: true, f: true },
            },
        ]
    }
    t.deepEqual(result, expectedResult)
})

const TEST_EQUATIONS_BAD_2: Equation[] = [
    {
        name: 'a=b+c+d',
        variables: ['a', 'b', 'c'],
        eqArrangements: {
            a: x => x.b + x.c + x.d,
            b: x => x.a - x.c - x.d,
            c: x => x.a - x.b - x.d,
            d: x => x.a - x.b - x.c,
        },
    },
    {
        name: 'a=e*f',
        variables: ['a', 'e', 'f'],
        eqArrangements: {
            a: x => x.e * x.f,
            e: x => x.a / x.f,
            f: x => x.a / x.e,
        },
    },
]

test('validateEquations should detect when equation arrangement keys aren\'t declared in variables', (t) => {
    const equations: Equation[] = TEST_EQUATIONS_BAD_2
    const variables = TEST_VARIABLES
    const inputs = {
        a: 15,
        b: 2,
        c: 6,
        d: 7,
        e: 3,
        f: 5,
    }

    const result = validateEquations(variables, equations, inputs)

    const expectedResult: EquationValidationResult = {
        isValid: false,
        badVariableCombinations: [],
        equations: [
            {
                name: 'a=b+c+d',
                variables: ['a', 'b', 'c'],
                variablesInArrangementsValid: false,
                eqArrangement: { a: Number.NaN, b: Number.NaN, c: Number.NaN },
                eqArrangementsValid: { a: false, b: false, c: false },
            },
            {
                name: 'a=e*f',
                variables: ['a', 'e', 'f'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 15, e: 3, f: 5 },
                eqArrangementsValid: { a: true, e: true, f: true },
            },
        ]
    }
    t.deepEqual(result, expectedResult)
})

test('validateEquations should notify when equations don\'t cover all valid variable combinations', (t) => {
    const equations: Equation[] = [
        {
            name: 'a + b + c = 10',
            variables: ['a', 'b', 'c'],
            eqArrangements: {
                a: x => 10 - x.b - x.c,
                b: x => 10 - x.a - x.c,
                c: x => 10 - x.a - x.b,
            },
        },
        {
            name: 'b - c + d = 6',
            variables: ['b', 'c', 'd'],
            eqArrangements: {
                b: x => 6 + x.c - x.d,
                c: x => x.b + x.d - 6,
                d: x => 6 - x.b + x.c,
            }
        }
    ]
    const variables = ['a', 'b', 'c', 'd']
    const inputs = {
        a: 1,
        b: 5,
        c: 4,
        d: 5,
    }

    const result = validateEquations(variables, equations, inputs)

    const expectedResult: EquationValidationResult = {
        isValid: false,
        badVariableCombinations: [['a', 'd']],
        equations: [
            {
                name: 'a + b + c = 10',
                variables: ['a', 'b', 'c'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 1, b: 5, c: 4 },
                eqArrangementsValid: { a: true, b: true, c: true },
            },
            {
                name: 'b - c + d = 6',
                variables: ['b', 'c', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { b: 5, c: 4, d: 5 },
                eqArrangementsValid: { b: true, c: true, d: true },
            }
        ]
    }
    t.deepEqual(result, expectedResult)
})

test('validateEquations should pass when core equations don\'t cover all valid variable combinations but do cover all with auxiliary equations', (t) => {
    const equations: Equation[] = [
        {
            name: 'a + b + c = 10',
            variables: ['a', 'b', 'c'],
            eqArrangements: {
                a: x => 10 - x.b - x.c,
                b: x => 10 - x.a - x.c,
                c: x => 10 - x.a - x.b,
            },
        },
        {
            name: 'b - c + d = 6',
            variables: ['b', 'c', 'd'],
            eqArrangements: {
                b: x => 6 + x.c - x.d,
                c: x => x.b + x.d - 6,
                d: x => 6 - x.b + x.c,
            }
        },
        {
            name: 'First equation add second equation | a + 2b + d = 16',
            variables: ['a', 'b', 'd'],
            eqArrangements: {
                a: x => 16 - 2 * x.b - x.d,
                b: x => (16 - x.a - x.d) / 2,
                d: x => 16 - x.a - 2 * x.b,
            },
            auxiliary: true,
        }
    ]
    const variables = ['a', 'b', 'c', 'd']
    const inputs = {
        a: 1,
        b: 5,
        c: 4,
        d: 5,
    }

    const result = validateEquations(variables, equations, inputs)

    const expectedResult: EquationValidationResult = {
        isValid: true,
        badVariableCombinations: [],
        equations: [
            {
                name: 'a + b + c = 10',
                variables: ['a', 'b', 'c'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 1, b: 5, c: 4 },
                eqArrangementsValid: { a: true, b: true, c: true },
            },
            {
                name: 'b - c + d = 6',
                variables: ['b', 'c', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { b: 5, c: 4, d: 5 },
                eqArrangementsValid: { b: true, c: true, d: true },
            },
            {
                name: 'First equation add second equation | a + 2b + d = 16',
                variables: ['a', 'b', 'd'],
                variablesInArrangementsValid: true,
                eqArrangement: { a: 1, b: 5, d: 5 },
                eqArrangementsValid: { a: true, b: true, d: true }
            }
        ]
    }
    t.deepEqual(result, expectedResult)
})