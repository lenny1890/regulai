import { diff_match_patch } from 'diff-match-patch'

/**
 * Retourne un tableau de segments pour afficher un diff mot-à-mot.
 * Chaque segment : { type: 'equal'|'insert'|'delete', text: string }
 */
export function computeWordDiff(original, corrected) {
  const dmp = new diff_match_patch()

  // Diff au niveau des mots
  const a = dmp.diff_wordsToChars_(original, corrected)
  const diffs = dmp.diff_main(a.chars1, a.chars2, false)
  dmp.diff_charsToLines_(diffs, a.lineArray)
  dmp.diff_cleanupSemantic(diffs)

  return diffs.map(([op, text]) => ({
    type: op === 1 ? 'insert' : op === -1 ? 'delete' : 'equal',
    text,
  }))
}
