import {
    AnyType,
    ClassType,
    FunctionType,
    OverloadedFunctionType,
    Type,
    TypeCategory,
    TypeCondition,
    UnionType,
    findSubtype,
    TypeVarType,
    ModuleType,
} from 'pyright-internal/analyzer/types';
import { ParameterCategory } from 'pyright-internal/parser/parseNodes';

const maxTypeRecursionCount = 30;

/// isTypeImplementable is based on pyright-internal/analyzer/types:isTypeSame
///     Should check occaisionally to make sure that we have this up-to-date,
///     but it seems unlikely to change often
export function isTypeImplementable(
    type1: Type,
    type2: Type,
    ignorePseudoGeneric = false,
    ignoreTypeFlags = false,
    recursionCount = 0,
    isSelfSame = false
): boolean {
    if (type1 === type2) {
        return true;
    }

    if (type1.category !== type2.category) {
        return false;
    }

    if (!ignoreTypeFlags && type1.flags !== type2.flags) {
        return false;
    }

    if (recursionCount > maxTypeRecursionCount) {
        return true;
    }
    recursionCount++;

    switch (type1.category) {
        case TypeCategory.Class: {
            const classType2 = type2 as ClassType;

            // If the details are not the same it's not the same class.
            if (!ClassType.isSameGenericClass(type1, classType2, recursionCount)) {
                return false;
            }

            if (!TypeCondition.isSame(type1.condition, type2.condition)) {
                return false;
            }

            if (!ignorePseudoGeneric || !ClassType.isPseudoGenericClass(type1)) {
                // Make sure the type args match.
                if (type1.tupleTypeArguments && classType2.tupleTypeArguments) {
                    const type1TupleTypeArgs = type1.tupleTypeArguments || [];
                    const type2TupleTypeArgs = classType2.tupleTypeArguments || [];
                    if (type1TupleTypeArgs.length !== type2TupleTypeArgs.length) {
                        return false;
                    }

                    for (let i = 0; i < type1TupleTypeArgs.length; i++) {
                        if (
                            !isTypeImplementable(
                                type1TupleTypeArgs[i].type,
                                type2TupleTypeArgs[i].type,
                                ignorePseudoGeneric,
                                /* ignoreTypeFlags */ false,
                                recursionCount,
                                isSelfSame
                            )
                        ) {
                            return false;
                        }

                        if (type1TupleTypeArgs[i].isUnbounded !== type2TupleTypeArgs[i].isUnbounded) {
                            return false;
                        }
                    }
                } else {
                    const type1TypeArgs = type1.typeArguments || [];
                    const type2TypeArgs = classType2.typeArguments || [];
                    const typeArgCount = Math.max(type1TypeArgs.length, type2TypeArgs.length);

                    for (let i = 0; i < typeArgCount; i++) {
                        // Assume that missing type args are "Any".
                        const typeArg1 = i < type1TypeArgs.length ? type1TypeArgs[i] : AnyType.create();
                        const typeArg2 = i < type2TypeArgs.length ? type2TypeArgs[i] : AnyType.create();

                        if (
                            !isTypeImplementable(
                                typeArg1,
                                typeArg2,
                                ignorePseudoGeneric,
                                /* ignoreTypeFlags */ false,
                                recursionCount,
                                isSelfSame
                            )
                        ) {
                            return false;
                        }
                    }
                }
            }

            if (!ClassType.isLiteralValueSame(type1, classType2)) {
                return false;
            }

            return true;
        }

        case TypeCategory.Function: {
            // Make sure the parameter counts match.
            const functionType2 = type2 as FunctionType;
            const params1 = type1.details.parameters;
            const params2 = functionType2.details.parameters;

            if (params1.length !== params2.length) {
                return false;
            }

            const positionalOnlyIndex1 = params1.findIndex(
                (param) => param.category === ParameterCategory.Simple && !param.name
            );
            const positionalOnlyIndex2 = params2.findIndex(
                (param) => param.category === ParameterCategory.Simple && !param.name
            );

            // Make sure the parameter details match.
            for (let i = 0; i < params1.length; i++) {
                const param1 = params1[i];
                const param2 = params2[i];

                // // Skip comparing self param, TODO: Add a flag for this
                // if (i === 0) {
                //     if (param1.name && param1.name === 'self' && param2.name && param2.name === 'self') {
                //         continue;
                //     }
                // }

                if (param1.category !== param2.category) {
                    return false;
                }

                const isName1Relevant = positionalOnlyIndex1 !== undefined && i >= positionalOnlyIndex1;
                const isName2Relevant = positionalOnlyIndex2 !== undefined && i >= positionalOnlyIndex2;

                if (isName1Relevant !== isName2Relevant) {
                    return false;
                }

                if (isName1Relevant) {
                    if (param1.name !== param2.name) {
                        return false;
                    }
                }

                const param1Type = FunctionType.getEffectiveParameterType(type1, i);
                const param2Type = FunctionType.getEffectiveParameterType(functionType2, i);
                if (
                    !isTypeImplementable(
                        param1Type,
                        param2Type,
                        ignorePseudoGeneric,
                        /* ignoreTypeFlags */ false,
                        recursionCount,
                        isSelfSame
                    )
                ) {
                    return false;
                }
            }

            // Make sure the return types match.
            let return1Type = type1.details.declaredReturnType;
            if (type1.specializedTypes && type1.specializedTypes.returnType) {
                return1Type = type1.specializedTypes.returnType;
            }
            if (!return1Type && type1.inferredReturnType) {
                return1Type = type1.inferredReturnType;
            }

            let return2Type = functionType2.details.declaredReturnType;
            if (functionType2.specializedTypes && functionType2.specializedTypes.returnType) {
                return2Type = functionType2.specializedTypes.returnType;
            }
            if (!return2Type && functionType2.inferredReturnType) {
                return2Type = functionType2.inferredReturnType;
            }

            if (return1Type || return2Type) {
                if (
                    !return1Type ||
                    !return2Type ||
                    !isTypeImplementable(
                        return1Type,
                        return2Type,
                        ignorePseudoGeneric,
                        /* ignoreTypeFlags */ false,
                        recursionCount
                    )
                ) {
                    return false;
                }
            }

            return true;
        }

        case TypeCategory.OverloadedFunction: {
            // Make sure the overload counts match.
            const functionType2 = type2 as OverloadedFunctionType;
            if (type1.overloads.length !== functionType2.overloads.length) {
                return false;
            }

            // We assume here that overloaded functions always appear
            // in the same order from one analysis pass to another.
            for (let i = 0; i < type1.overloads.length; i++) {
                if (
                    !isTypeImplementable(
                        type1.overloads[i],
                        functionType2.overloads[i],
                        ignorePseudoGeneric,
                        ignoreTypeFlags,
                        recursionCount
                    )
                ) {
                    return false;
                }
            }

            return true;
        }

        case TypeCategory.Union: {
            const unionType2 = type2 as UnionType;
            const subtypes1 = type1.subtypes;
            const subtypes2 = unionType2.subtypes;

            if (subtypes1.length !== subtypes2.length) {
                return false;
            }

            // The types do not have a particular order, so we need to
            // do the comparison in an order-independent manner.
            return (
                findSubtype(type1, (subtype) => !UnionType.containsType(unionType2, subtype, recursionCount)) ===
                undefined
            );
        }

        case TypeCategory.TypeVar: {
            const type2TypeVar = type2 as TypeVarType;

            // scip-python: Allow for comparing, ignoring particular values for self
            if (isSelfSame && type1.details.isSynthesizedSelf && type2TypeVar.details.isSynthesizedSelf) {
                return true;
            }

            if (type1.scopeId !== type2TypeVar.scopeId) {
                return false;
            }

            // Handle the case where this is a generic recursive type alias. Make
            // sure that the type argument types match.
            if (type1.details.recursiveTypeParameters && type2TypeVar.details.recursiveTypeParameters) {
                const type1TypeArgs = type1?.typeAliasInfo?.typeArguments || [];
                const type2TypeArgs = type2?.typeAliasInfo?.typeArguments || [];
                const typeArgCount = Math.max(type1TypeArgs.length, type2TypeArgs.length);

                for (let i = 0; i < typeArgCount; i++) {
                    // Assume that missing type args are "Any".
                    const typeArg1 = i < type1TypeArgs.length ? type1TypeArgs[i] : AnyType.create();
                    const typeArg2 = i < type2TypeArgs.length ? type2TypeArgs[i] : AnyType.create();

                    if (
                        !isTypeImplementable(
                            typeArg1,
                            typeArg2,
                            ignorePseudoGeneric,
                            /* ignoreTypeFlags */ false,
                            recursionCount
                        )
                    ) {
                        return false;
                    }
                }
            }

            if (type1.details === type2TypeVar.details) {
                return true;
            }

            if (
                type1.details.name !== type2TypeVar.details.name ||
                type1.details.isParamSpec !== type2TypeVar.details.isParamSpec ||
                type1.details.isVariadic !== type2TypeVar.details.isVariadic ||
                type1.details.isSynthesized !== type2TypeVar.details.isSynthesized ||
                type1.details.declaredVariance !== type2TypeVar.details.declaredVariance ||
                type1.scopeId !== type2TypeVar.scopeId
            ) {
                return false;
            }

            const boundType1 = type1.details.boundType;
            const boundType2 = type2TypeVar.details.boundType;
            if (boundType1) {
                if (
                    !boundType2 ||
                    !isTypeImplementable(
                        boundType1,
                        boundType2,
                        ignorePseudoGeneric,
                        /* ignoreTypeFlags */ false,
                        recursionCount
                    )
                ) {
                    return false;
                }
            } else {
                if (boundType2) {
                    return false;
                }
            }

            const constraints1 = type1.details.constraints;
            const constraints2 = type2TypeVar.details.constraints;
            if (constraints1.length !== constraints2.length) {
                return false;
            }

            for (let i = 0; i < constraints1.length; i++) {
                if (
                    !isTypeImplementable(
                        constraints1[i],
                        constraints2[i],
                        ignorePseudoGeneric,
                        /* ignoreTypeFlags */ false,
                        recursionCount
                    )
                ) {
                    return false;
                }
            }

            return true;
        }

        case TypeCategory.Module: {
            const type2Module = type2 as ModuleType;

            // Module types are the same if they share the same
            // module symbol table.
            if (type1.fields === type2Module.fields) {
                return true;
            }

            // If both symbol tables are empty, we can also assume
            // they're equal.
            if (type1.fields.size === 0 && type2Module.fields.size === 0) {
                return true;
            }

            return false;
        }
    }

    return true;
}
