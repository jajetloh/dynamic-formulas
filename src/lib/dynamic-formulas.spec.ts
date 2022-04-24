import test from 'ava'

import { solveEquations, DynamicFormulaSolver, Equation, SolverVariable } from './dynamic-formulas'

const TEST_EQUATIONS = [
    {
        name: 'a=b+c+d',
        variables: ['a', 'b', 'c', 'd'],
        equations: {
            a: x => x.b + x.c + x.d,
            b: x => x.a - x.c - x.d,
            c: x => x.a - x.b - x.d,
            d: x => x.a - x.b - x.c,
        },
    },
    {
        name: 'a=e*f',
        variables: ['a', 'e', 'f'],
        equations: {
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

