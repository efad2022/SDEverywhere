import * as fs from 'fs';
import * as path from 'path';
import * as R from 'ramda';
import * as F from './futil';

export function preprocessModel(mdlFilename, spec, writeRemovals = false) {
  function firstLine(s) {
    let i = s.indexOf('\n');
    if (i < 0) {
      return s.trim();
    } else {
      return s.slice(0, i).trim();
    }
  }
  function emit(s) {
    F.emitLine(s, 'pp');
    F.emit('\t|\n\n', 'pp');
  }
  function emitRemoval(s) {
    F.emitLine(s, 'rm');
    F.emit('\t|\n\n', 'rm');
  }

  // Open output channels.
  F.open('rm');
  F.open('pp');
  // Read the model file and remove the sketch information at the end.
  let mdl = fs.readFileSync(mdlFilename, 'utf8');
  // Trim the sketch section.
  let iEnd = mdl.indexOf('\\\\\\---/// Sketch');
  mdl = mdl.slice(0, iEnd);

  // Remove the macro section.
  let inMacroSection = false;
  R.forEach(line => {
    if (!inMacroSection && R.contains(':MACRO:', line)) {
      F.emitLine(line, 'rm');
      inMacroSection = true;
    } else if (inMacroSection) {
      F.emitLine(line, 'rm');
      if (R.contains(':END OF MACRO:', line)) {
        F.emit('\n', 'rm');
        inMacroSection = false;
      }
    } else {
      F.emitLine(line, 'pp');
    }
  }, mdl.split(/\r?\n/));
  mdl = F.getBuf('pp');
  F.clearBuf('pp');

  // Split the model into an array of equations and groups.
  let eqns = R.map(eqn => eqn.trim(), mdl.split('|'));
  // Remove some equations into the removals channel.
  R.forEach(eqn => {
    let s = firstLine(eqn);
    if (R.contains('********************************************************', s)) {
      // Skip groups
    } else if (R.contains('TABBED ARRAY', s)) {
      emitRemoval(eqn);
    } else if (s.endsWith(':')) {
      // Subscript range definition
      emitRemoval(eqn);
      // } else if (R.contains(':SUPPLEMENTARY', eqn)) {
      //   emitRemoval(eqn)
    } else if (R.contains('SAMPLE UNTIL', eqn)) {
      emitRemoval(eqn);
    } else if (R.contains('RAMP FROM TO', eqn)) {
      emitRemoval(eqn);
    } else if (!R.isEmpty(eqn)) {
      emit(eqn);
    }
  }, eqns);
  mdl = F.getBuf('pp');
  F.clearBuf('pp');

  // Join lines continued with trailing backslash characters.
  let backslash = /\\\s*$/;
  let prevLine = '';
  R.forEach(line => {
    if (!R.isEmpty(prevLine)) {
      line = prevLine + line.trim();
      prevLine = '';
    }
    let m = line.match(backslash);
    if (m) {
      prevLine = line.substr(0, m.index);
    }
    if (R.isEmpty(prevLine)) {
      F.emitLine(line, 'pp');
    }
  }, mdl.split(/\r?\n/));

  // Write removals to a file in the model directory.
  if (writeRemovals) {
    let rmPathname = path.join(path.dirname(mdlFilename), 'removals.txt');
    F.writeBuf(rmPathname, 'rm');
  }
  // Return the preprocessed model as a string.
  return F.getBuf('pp');
}
