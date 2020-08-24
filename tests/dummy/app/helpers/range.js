import { helper } from '@ember/component/helper';

export default helper(function range(params/*, hash*/) {
  const [ from , to ] = params;
  const result = Array(to -from + 1).fill(0).map( (a, i) => from +i);
  return result;
});
