import test from 'node:test';
import assert from 'node:assert/strict';
import {firestoreErrorMessage} from '../src/firebase-errors.mjs';
test('offline failures and permissions receive distinct actionable messages',()=>{
 assert.ok(firestoreErrorMessage({code:'unavailable',message:'Failed to get document because the client is offline.'}).includes('conectarse'));
 assert.ok(firestoreErrorMessage({code:'firestore/permission-denied'}).includes('cuenta oficial'));
 assert.ok(firestoreErrorMessage({code:'unauthenticated'}).includes('iniciar sesión'));
 assert.ok(firestoreErrorMessage({code:'unknown'}).includes('(unknown)'));
});
