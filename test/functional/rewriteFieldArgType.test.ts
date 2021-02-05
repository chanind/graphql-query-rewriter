import RewriteHandler from '../../src/RewriteHandler';
import FieldArgTypeRewriter from '../../src/rewriters/FieldArgTypeRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite field arg type', () => {
  it('allows rewriting the type of args provided to queries', () => {
    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
      }),
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: Int!, $arg3: String!) {
        things(identifier: $arg1, otherArg: $arg2) {
          cat
          dog {
            catdog
          }
        }
        otherThing(arg3: $arg3) {
          otherThingField
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: Int!, $arg3: String!) {
        things(identifier: $arg1, otherArg: $arg2) {
          cat
          dog {
            catdog
          }
        }
        otherThing(arg3: $arg3) {
          otherThingField
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined,
    });
    const response = {
      things: {
        cat: 'meh',
        dog: [
          {
            catDog: '123',
          },
        ],
      },
      otherThing: {
        otherThingField: 18,
      },
    };
    // shouldn't modify the response
    expect(handler.rewriteResponse(response)).toEqual(response);

    // shouldn't allow calling rewrite multiple times
    expect(() => handler.rewriteRequest(query)).toThrow();
    expect(() => handler.rewriteResponse(response)).toThrow();
  });

  it('can be passed a coerceVariable function to change variable values', () => {
    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        coerceVariable: (val) => parseInt(val, 10),
      }),
    ]);
    expect(handler.rewriteRequest(query, { arg1: '123', arg2: 'blah' })).toEqual({
      query: expectedRewritenQuery,
      variables: {
        arg1: 123,
        arg2: 'blah',
      },
    });
  });

  it('works on deeply nested fields', () => {
    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: String) {
        stuff {
          things(identifier: $arg1, arg2: $arg2) {
            cat
          }
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: String) {
        stuff {
          things(identifier: $arg1, arg2: $arg2) {
            cat
          }
        }
      }
    `;

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        coerceVariable: (val) => parseInt(val, 10),
      }),
    ]);
    expect(handler.rewriteRequest(query, { arg1: '123', arg2: 'blah' })).toEqual({
      query: expectedRewritenQuery,
      variables: {
        arg1: 123,
        arg2: 'blah',
      },
    });
  });
});
