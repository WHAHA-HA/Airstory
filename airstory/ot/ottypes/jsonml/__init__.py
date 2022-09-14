''' These methods let you build a transform function from a transformComponent
 function for OT types like JSON0 in which operations are lists of components
 and transforming them requires N^2 work. I find it kind of nasty that I need
 this, but I'm not really sure what a better solution is. Maybe I should do
 this automatically to types that don't have a compose function defined.

 Add transform and transformX functions for an OT type which has
 transformComponent defined.  transformComponent(destination array,
 component, other component, side)'''
import copy
import numbers


class Transform:
    def transform_component(self, dest, c, other_c, side):
        raise NotImplementedError("Please Implement this method")
    
    def check_valid_ops(self, ops):
        raise NotImplementedError("Please Implement this method")
    
    def append(self, new_op, c):
        raise NotImplementedError("Please Implement this method")
    
    def transform_component_x(self, left, right, dest_left, dest_right):
        self.transform_component(dest_left, left, right, 'left')
        self.transform_component(dest_right, right, left, 'right')

    def transform_x(self, left_ops, right_ops):
        self.check_valid_ops(left_ops)
        self.check_valid_ops(right_ops)
        
        newRightOp = []

        for right_op in right_ops:
            rightComponent = right_op

            # Generate newLeftOp by composing leftOp by rightComponent
            newLeftOp = []
            k = 0
            
            while k < len(left_ops):
                nextC = []
                self.transform_component_x(left_ops[k], rightComponent, newLeftOp, nextC)
                k += 1

                if len(nextC) == 1:
                    rightComponent = nextC[0]
                elif len(nextC) == 0:
                    left_ops_len = len(left_ops)
                    
                    for x in range(k, left_ops_len):
                        self.append(newLeftOp, left_ops[x])
                        
                    rightComponent = None
                    break
                else:
                    # Recurse.
                    pairs = self.transform_x(left_ops[k:], nextC)
          
                    for pair in pairs[0]:
                        self.append(newLeftOp, pair)
                        
                    for pair in pairs[1]:
                        self.append(newRightOp, pair)
                        
                    rightComponent = None
                    break

            if rightComponent:
                self.append(newRightOp, rightComponent)
      
            left_ops = newLeftOp
            
        return left_ops, newRightOp

    def transform(self, op, otherOp, type):
        '''Transforms op with specified type ('left' or 'right') by otherOp.'''
    
        if not (type == 'left' or type == 'right'):
            raise Exception("type must be 'left' or 'right'")

        if len(otherOp) == 0:
            return op

        if len(op) == 1 and len(otherOp) == 1:
            return self.transform_component([], op[0], otherOp[0], type)

        if type == 'left':
            return self.transform_x(op, otherOp)[0]
        else:
            return self.transform_x(otherOp, op)[1]

def str_inject(s1, pos, s2):
    '''Insert s2 into s1 at pos.'''
    
    return s1[:pos] + s2 + s1[pos:]

def check_valid_component(c):
    '''Check that an operation component is valid. Throws if its invalid.'''
    
    if not isinstance(c['p'], numbers.Number):
        raise Exception('component missing position field')

    if 'i' in c and isinstance(c['i'], str) and 'd' in c and isinstance(c['d'], str):
        raise Exception('component needs an i or d field')

    if c['p'] < 0:
        raise Exception('position cannot be negative')
        
def invert_component(c):
    if c['i']:
        return {'d': c['i'], 'p': c['p']}
    else:
        return {'i':c['d'], 'p':c['p']}

''' This type works, but should not be used. Its included here because the JSON0
 embedded string operations use this library.


 A simple text implementation

 Operations are lists of components. Each component either inserts or deletes
 at a specified position in the document.

 Components are either:
  {i:'str', p:100}: Insert 'str' at position 100 in the document
  {d:'str', p:100}: Delete 'str' at position 100 in the document

 Components in an operation are executed sequentially, so the position of components
 assumes previous components have already executed.

 Eg: This op:
   [{i:'abc', p:0}]
 is equivalent to this op:
   [{i:'a', p:0}, {i:'b', p:1}, {i:'c', p:2}]'''
    
class Text0(Transform):
    name = 'text0'
    uri = ''
    
    def create(self, initial):
        if initial and isinstance(initial, str):
            #TODO: create something more specific
            raise Exception('Initial data must be a string')
        
        return initial or ''
    
    def check_valid_ops(self, ops):
        '''Check that an operation is valid'''
        
        for op in ops:
            check_valid_component(op)
            
    def adjust_pos(self, snapshot, pos):
        ''' Internally, javascript strings are a modified charset. It is more than UCS-2 but not quite UTF-16.
        Because of this, the position in the string that javascript sees that include characters that require 32 bytes (emojis)
        will be different than the position that Python sees. For example, JS sees emojis as two chars where Python sees it as one'''
        
        sub = snapshot[:pos]
        
        bytes_16 = sub.encode('utf-16-be')
        
        pylen = len(sub)
        jslen = len(bytes_16) / 2
        
        if pylen == jslen:
            return pylen
        else:
            count = 0
            
            for x in range(pylen):
                chars = len(sub[x].encode('utf-16-be')) / 2
                pos -= chars
                count += 1
                
                if pos == 0: 
                    break
                
            return count
    
    def apply(self, snapshot, ops):
        '''Apply op to snapshot'''
        self.check_valid_ops(ops)
        
        for op in ops:
            component = op
            
            pos = component['p']
            pos = self.adjust_pos(snapshot, pos)
            
            if 'i' in component:
                snapshot = str_inject(snapshot, pos, component['i'])
            else:
                deleted = snapshot[pos:pos+len(component['d'])]
                
                if component['d'] != deleted:
                    raise Exception("Delete component '" + component['d'] + "' does not match deleted text '" + deleted + "'")

                snapshot = snapshot[:pos] + snapshot[pos+len(component['d']):]
                
        return snapshot
    
    def append(self, new_op, c):
        '''
        Append a component to the end of new_op. Exported for use by the random op
        generator and the JSON0 type.
        '''
        
        if ('i' in c and c['i'] == '') or ('d' in c and c['d'] == ''): 
            return

        if len(new_op) == 0:
            new_op.append(c)
        else:
            last = new_op[len(new_op) - 1]

            if 'i' in last and 'i' in c and last['p'] <= c['p'] and c['p'] <= last['p'] + len(last['i']):
                # Compose the insert into the previous insert
                new_op[len(new_op) - 1] = {'i': str_inject(last['i'], c['p'] - last['p'], c['i']), 'p': last['p']}
        
            elif 'd' in last and 'd' in c and c['p'] <= last['p'] and last['p'] <= c['p'] + len(c['d']):
                # Compose the deletes together
                new_op[len(new_op) - 1] = {'d': str_inject(c['d'], last['p'] - c['p'], last['d']), 'p': c['p']}
            else:
                new_op.append(c)
                
    def compose(self, op1, op2):
        '''Compose op1 and op2 together'''
        
        self.check_valid_ops(op1)
        self.check_valid_ops(op2)
  
        new_op = op1[:]
        
        for op in op2:
            self.append(new_op, op)
  
        return new_op
    
    def normalize(self, ops):
        '''Clean up an op'''
        
        new_op = []

        '''Normalize should allow ops which are a single (unwrapped) component:
        {i:'asdf', p:23}.'''
        
        if not isinstance(ops, list):
            ops = [ops]

        for op in ops:
            c = op
            
            if not 'p' in c or not c['p']: 
                c['p'] = 0

            self.append(new_op, c)

        return new_op
    
    def transform_position(self, pos, c, after=False):
        ''' This helper method transforms a position by an op component.
        
         If c is an insert, insertAfter specifies whether the transform
         is pushed after the insert (true) or before it (false).
        
         insertAfter is optional for deletes.'''
  
        if 'i' in c:
            if c['p'] < pos or (c['p'] == pos and after):
                return pos + len(c['i'])
            else:
                return pos
        else:
            if pos <= c['p']:
                return pos
            elif pos <= c['p'] + len(c['d']):
                return c['p']
            else:
                return pos - len(c['d'])
            
    
    def transform_cursor(self, position, ops, side='left'):
        ''' Helper method to transform a cursor position as a result of an op.
         Like transformPosition above, if c is an insert, insertAfter specifies
         whether the cursor position is pushed after an insert (true) or before it
         (false).'''
        
        after = side == 'right'
        
        for op in ops:
            position = self.transform_position(position, op, after)

        return position
    
      
    def transform_component(self, dest, c, other_c, side):
        ''' Transform an op component by another op component. Asymmetric.
         The result will be appended to destination.
         exported for use in JSON type '''

        check_valid_component(c)
        check_valid_component(other_c)

        if 'i' in c:
            # Insert.
            self.append(dest, {'i': c['i'], 'p': self.transform_position(c['p'], other_c, side == 'right')})
        else:
            # Delete
            if 'i' in other_c:
                # Delete vs insert
                s = c['d']
                
                if c['p'] < other_c['p']:
                    self.append(dest, {'d': s[0:other_c['p'] - c['p']], 'p': c['p']})
                    s = s[other_c['p'] - c['p']:]
                    
                if s:
                    self.append(dest, {'d': s, 'p': c['p'] + len(other_c['i'])})

            else:
                # Delete vs delete
                if c['p'] >= other_c['p'] + len(other_c['d']):
                    self.append(dest, {'d': c['d'], 'p': c['p'] - len(other_c['d'])})
                elif c['p'] + len(c['d']) <= other_c['p']:
                    self.append(dest, c)
                else:
                    # They overlap somewhere.
                    new_c = {'d': '', 'p': c['p']}

                    if c['p'] < other_c['p']:
                        new_c['d'] = c['d'][0:other_c['p'] - c['p']]

                    if c['p'] + len(c['d']) > other_c['p'] + len(other_c['d']):
                        new_c['d'] += c['d'][other_c['p'] + len(other_c['d']) - c['p']:]

                    # This is entirely optional - I'm just checking the deleted text in
                    # the two ops matches
                    intersect_start = max(c['p'], other_c['p'])
                    intersect_end = min(c['p'] + len(c['d']), other_c['p'] + len(other_c['d']))
                    c_intersect = c['d'][intersect_start - c['p']:intersect_end - c['p']]
                    other_intersect = other_c['d'][intersect_start - other_c['p']:intersect_end - other_c['p']]
                    
                    if c_intersect != other_intersect:
                        raise Exception('Delete ops delete different text in the same region of the document')

                    if new_c['d']:
                        new_c['p'] = self.transform_position(new_c['p'], other_c)
                        self.append(dest, new_c)

        return dest
    
    
    def invert(self, ops):
        '''No need to use append for invert, because the components won't be able to
        cancel one another.'''
        
        #Shallow copy & reverse that sucka.
        ops = ops[:]
        ops.reverse()
        
        for op in ops:
            op = invert_component(op)
            
        return ops

''' 
This is the implementation of the JSON OT type.

Spec is here: https://github.com/josephg/ShareJS/wiki/JSON-Operations

Note: This is being made obsolete. It will soon be replaced by the JSON2 type.

UTILITY FUNCTIONS
'''

'''
Checks if the passed object is an Array instance. Can't use Array.isArray
yet because its not supported on IE8.

@param obj
@returns {boolean}
'''
def is_array(obj):
    return isinstance(obj, list)


'''
Checks if the passed object is an dict instance.
No function call (fast) version

@param obj
@returns {boolean}
'''
def is_dict(obj):
    return isinstance(obj, dict)

'''
 * Clones the passed object
'''
def clone(o):
    return copy.deepcopy(o)

# helper functions to convert old string ops to and from subtype ops
def convertFromText(c):
    c['t'] = 'text0'
    o = {'p': c['p'].pop()}
    if 'si' in c: 
        o['i'] = c['si']
    if 'sd' in c: 
        o['d'] = c['sd']
    c['o'] = [o]

def convertToText(c):
    c['p'].append(c['o'][0]['p'])
    if 'i' in c['o'][0]:
        c['si'] = c['o'][0]['i']
    if 'd' in c['o'][0]:
        c['sd'] = c['o'][0]['d']
    
    if 't' in c:
        del c['t']
    del c['o']
    
def find_replace(needle, haystack, value):
    haystack_len = len(haystack)
    
    if is_array(haystack) and haystack_len > 1:
        start = 1
        
        if is_dict(haystack[1]) and haystack_len > 2:
            start = 2
            
        for x in range(start, haystack_len):
            if is_array(haystack[x]):
                check = find_replace(needle, haystack[x], value)
                
                if check:
                    return check
            elif needle == haystack[x]:
                haystack[x] = value
                
                return True
        
    return False

'''
JSON OT Type
@type {*}
'''
class JsonML0(Transform):
    name = 'jsonml0'
    uri = ''
    subtypes = {}
    
    def __init__(self):
        self.register_subtype(Text0())
    
    def register_subtype(self, subtype):
        ''''You can register another OT type as a subtype in a JSON document using
        the following function. This allows another type to handle certain
        operations instead of the builtin JSON type.'''
        
        self.subtypes[subtype.name] = subtype

    def create(self, data=None):
        if data:
            return clone(data)
        else:
            return None

    def invert_component(self, c):
        c_ = {'p': c['p']}

        # handle subtype ops
        if 't' in c and self.subtypes[c['t']]:
            c_['t'] = c['t']
            c_['o'] = self.subtypes[c['t']].invert(c['o'])

        if 'si' in c:
            c_['sd'] = c['si']
             
        if 'sd' in c: 
            c_['si'] = c['sd']
            
        if 'ss' in c:
            c_['sm'] = c['ss']
            
        if 'sm' in c:
            c_['ss'] = c['sm']
            
        if 'oi' in c:
            c_['od'] = c['oi']
            
        if 'od' in c:
            c_['oi'] = c['od']
            
        if 'li' in c:
            c_['ld'] = c['li']
            
        if 'ld' in c:
            c_['li'] = c['ld']
            
        if 'na' in c:
            c_['na'] = -c['na']

        if 'lm' in c: 
            c_['lm'] = c['p'][len(c['p'])-1]
            c_['p'] = c['p'][0,len(c['p'])-1] + [c.lm]

        return c_

    def invert(self, ops):
        ops_ = ops[:]
        ops_.reverse()
        iop = []
        
        for op_ in ops_:
            iop.append(self.invert_component(op_))
        
        return iop

    def check_valid_ops(self, ops):
        for op in ops:
            if not is_array(op['p']):
                raise Exception('Missing path')

    def check_list(self, elem):
        if not is_array(elem):
            raise Exception('Referenced element not a list')

    def check_dict(self, elem):
        if not is_dict(elem):
            raise Exception("Referenced element not an object (it was " + elem + ")")

    def apply(self, snapshot, ops):
        self.check_valid_ops(ops)

        ops = clone(ops)

        container = {'data': snapshot}

        for op in ops:
            c = op
            
            # convert old string ops to use subtype for backwards compatibility
            if 'si' in c or 'sd' in c:
                convertFromText(c)

            parent = None
            parentKey = None
            elem = container
            key = 'data'

            for p in c['p']:
                parent = elem
                parentKey = key
                elem = elem[key]
                key = p

                if not parent:
                    raise Exception('Path invalid')

            if 't' in c and 'o' in c and self.subtypes[c['t']]:
                # handle subtype ops
                elem[key] = self.subtypes[c['t']].apply(elem[key], c['o'])
                
            elif 'ss' in c:
                # String split
                self.check_list(parent)
                parent[parentKey] = c['ss'][0]
                parent.insert(parentKey+1, c['ss'][1])
            
            elif 'sm' in c:
                # String merge
                self.check_list(parent)
                parent[parentKey] = ''.join(c['sm'])
                del parent[parentKey+1]    
    
            elif 'na' in c:
                #Number add
                if not isinstance(elem[key], numbers.Number):
                    raise Exception('Referenced element not a number')
    
                elem[key] += c['na']
            elif 'li' in c and 'ld' in c:
                # List replace
                self.check_list(elem)
                # Should check the list element matches c.ld
                elem[key] = c['li']
            elif 'li' in c:
                # List insert
                self.check_list(elem)
                #elem = elem[:key] + [c['li']] + elem[key:]
                elem.insert(key, c['li'])
            elif 'ld' in c:
                # List delete
                self.check_list(elem)
                #Should check the list element matches c.ld here too.
                del elem[key]
            elif 'lm' in c:
                # List move
                self.check_list(elem)
                if c['lm'] != key:
                    e = elem[key]
                    # Remove it...
                    del elem[key]
                    # And insert it back.
                    elem.insert(c['lm'], e)
            elif 'oi' in c:
                # Object insert / replace
                self.check_dict(elem)
    
                # Should check that elem[key] == c.od
                if len(c['p']) == 0 and is_array(elem[key]):
                    elem[key][:] = c['oi']
                else:
                    elem[key] = c['oi']
            elif 'od' in c:
                # Object delete
                self.check_dict(elem)
    
                # Should check that elem[key] == c.od
                del elem[key]
            else:
                raise Exception('invalid / missing instruction in op')
    
        return container['data']

    def shatter(self, ops):
        '''Helper to break an operation up into a bunch of small ops.'''
        results = []
        for op in ops:
            results.append([op])
  
        return results


    def incremental_apply(self, snapshot, ops, _yield):
        for op in ops:
            small_op = [op]
            snapshot = self.apply(snapshot, small_op)
            #I'd just call this yield, but thats a reserved keyword. Bah!
            _yield(small_op, snapshot)

        return snapshot


    def path_matches(self, p1s, p2s, ignore_last=False):
        # Checks if two paths, p1 and p2 match.
        if len(p1s) != len(p2s):
            return False

        for i, p1 in enumerate(p1s):
            if p1 != p2s[i] and (not ignore_last or i != p1s.length - 1):
                return False

        return True

    def append(self, dest, c):
        c = clone(c)

        if len(dest) == 0:
            dest.append(c)
            return

        last = dest[len(dest) - 1]
        
        
        # convert old string ops to use subtype for backwards compatibility
        if ('si' in c or 'sd' in c) and ('si' in last or 'sd' in last):
            convertFromText(c)
            convertFromText(last)

        if self.path_matches(c['p'], last['p']):
            # handle subtype ops
            
            if 't' in c and 't' in last and c['t'] == last['t'] and c['t'] in self.subtypes:
                last['o'] = self.subtypes[c['t']].compose(last['o'], c['o'])
                
                # convert back to old string ops
                if 'si' in c or 'sd' in c:
                    p = c['p']
                    for _ in range(len(last['o'])-1):
                        c['o'] = [last['o'].pop()]
                        c['p'] = p[:]
                        convertToText(c)
                        dest.append(c)
                
                    convertToText(last)
            elif 'ss' in last and 'sm' in c and last['ss'][0] == c['sm'][0] and last['ss'][1] == c['sm'][1]:
                # An string split directly followed by a string merge turns into a no-op and can be removed.
                dest.pop()
            elif 'ss' in c and 'sm' in last and last['sm'][0] == c['ss'][0] and last['sm'][1] == c['ss'][1]:
                # An string merge directly followed by a string split turns into a no-op and can be removed.
                dest.pop()
            elif 'na' in last and 'na' in c:
                dest[len(dest) - 1] = {'p': last['p'], 'na': last['na'] + c['na']}
            elif 'li' in last and 'li' not in c and c['ld'] == last['li']:
                # insert immediately followed by delete becomes a noop.
                if 'ld' in last:
                    # leave the delete part of the replace
                    del last['li']
                else:
                    dest.pop()
            elif 'od' in last and 'oi' not in last and 'oi' in c and 'od' not in c:
                last['oi'] = c['oi']
            elif 'oi' in last and 'od' in c:
                # The last path component inserted something that the new component deletes (or replaces).
                # Just merge them.
                if c['oi']:
                    last['oi'] = c['oi']
                elif last['od']:
                    del last['oi']
                else:
                    # An insert directly followed by a delete turns into a no-op and can be removed.
                    dest.pop()
            elif 'lm' in c and c['p'][len(c['p']) - 1] == c['lm']:
                # don't do anything
                pass
            else:
                dest.append(c)
        else:
            # convert string ops back
            if ('si' in c or 'sd' in c) and ('si' in last or 'sd' in last):
                convertToText(c)
                convertToText(last)
                
            dest.append(c)

    def compose(self, op1s, op2s):
        self.check_valid_ops(op1s)
        self.check_valid_ops(op2s)

        new_op = clone(op1s)

        for op in op2s:
            self.append(new_op, op)

        return new_op
    
    
    def normalize(self, ops):
        new_op = []

        if not is_array(ops):
            ops = [ops]

        for op in ops:
            c = op
            if not c['p']:
                c['p'] = []

            self.append(new_op, c)

        return new_op

    def common_length_for_ops(self, a, b):
        # Returns the common length of the paths of ops a and b
        alen = len(a['p'])
        blen = len(b['p'])
    
        if 'na' in a or 't' in a:
            alen += 1
        elif ('sm' in a or 'ss' in a) and 'si' not in b and 'sd' not in b:
            alen -= 1
        
        if 'na' in b or 't' in b:
            blen += 1
        elif ('sm' in b or 'ss' in b) and 'si' not in a and 'sd' not in a:
            blen -= 1
        
        if ('ss' in b or 'sm' in b) and ('si' in a or 'sd' in a):
            alen -= 1
            blen -= 1   
        elif ('ss' in a or 'sm' in a) and ('si' in b or 'sd' in b):
            alen -= 1
            blen -= 1
        

        if alen == 0:
            return -1
        
        if blen == 0:
            return None

        alen -= 1
        blen -= 1

        for i in range(alen):
            p = a['p'][i]
            if i >= blen or p != b['p'][i]:
                return None

        return alen
    
    def can_op_affect_path(self, op, path):
        # Returns true if an op can affect the given path
        return self.common_length_for_ops({'p': path}, op) != None

    def transform_component(self, dest, c, other_c, type):
        # transform c so it applies to a document with otherC applied.
        c = clone(c)

        common = self.common_length_for_ops(other_c, c)
        common2 = self.common_length_for_ops(c, other_c)
        cplength = len(c['p'])
        other_cplength = len(other_c['p'])

        if 'na' in c or ('t' in c and c['t']):
            cplength += 1
        elif ('ss' in c or 'sm' in c) and 'si' not in other_c and 'sd' not in other_c:
            cplength -= 1

        if 'na' in other_c or ('t' in other_c and other_c['t']):
            other_cplength += 1
        elif ('ss' in other_c or 'sm' in other_c) and 'si' not in c and 'sd' not in c:
            other_cplength -= 1
           
        cp_common = None
        other_cp_common = None
         
        if common2 != None and common2 > -1:
            if common2 < len(c['p']):
                cp_common = c['p'][common2]
                
            if common2 < len(other_c['p']):
                other_cp_common = other_c['p'][common2]
        elif common2 == -1:
            cp_common = True
            other_cp_common = True

        # if c is deleting something, and that thing is changed by otherC, we need to
        # update c to reflect that change for invertibility.
        if common2 != None and other_cplength > cplength and cp_common == other_cp_common and cp_common != None:
            if 'ld' in c:
                oc = clone(other_c)
                oc['p'] = oc['p'][cplength:]
                c['ld'] = self.apply(clone(c['ld']), [oc])
            elif 'od' in c:
                oc = clone(other_c)
                oc['p'] = oc['p'][cplength:]
                c['od'] = self.apply(clone(c['od']), [oc])

        if common != None:
            common_operand = cplength == other_cplength
                
            if 'si' in other_c:
                if 'ss' in c and cplength == other_cplength and other_c['p'][common] == c['p'][common]:
                    first_len = len(c['ss'][0])
                
                    oc = clone(other_c)
                    convertFromText(oc)
                    
                    for op in oc['o']:
                        if op['p'] > first_len:
                            op['p'] -= first_len
                            c['ss'][1] = self.subtypes['text0'].apply(c['ss'][1], [op])
                        else:
                            c['ss'][0] = self.subtypes['text0'].apply(c['ss'][0], [op])
                            c['p'][-1] += len(op['i'])
                elif 'sm' in c:
                    oc = clone(other_c)
                    convertFromText(oc)
                    
                    if cplength == other_cplength and other_c['p'][common] == c['p'][common]+1:
                        for op in oc['o']:
                            c['sm'][1] = self.subtypes['text0'].apply(c['sm'][1], [op])
                    elif cplength == other_cplength and other_c['p'][common] == c['p'][common]:
                        for op in oc['o']:
                            c['sm'][0] = self.subtypes['text0'].apply(c['sm'][0], [op])
                            c['p'][-1] += len(op['i'])
            elif 'sd' in other_c:
                if 'ss' in c and cplength == other_cplength and other_c['p'][common] == c['p'][common]:
                    first_len = len(c['ss'][0])
                
                    oc = clone(other_c)
                    convertFromText(oc)
                    
                    for op in oc['o']:
                        del_len = len(op['d'])
                        
                        if op['p'] >= first_len:
                            op['p'] -= first_len
                            c['ss'][1] = self.subtypes['text0'].apply(c['ss'][1], [op])
                        elif op['p'] < first_len and op['p'] + del_len <= first_len:
                            c['ss'][0] = self.subtypes['text0'].apply(c['ss'][0], [op])
                            c['p'][-1] -= del_len
                        else:
                            split_point = first_len - op['p']
                            first_mod = op['d'][:split_point]
                            second_mod = op['d'][split_point:]
                            
                            first_op = {'p': op['p'], 'd': first_mod}
                            c['ss'][0] = self.subtypes['text0'].apply(c['ss'][0], [first_op])
                            c['p'][-1] -= split_point
                            
                            second_op = {'p': 0, 'd': second_mod}
                            c['ss'][1] = self.subtypes['text0'].apply(c['ss'][1], [second_op])
                elif 'sm' in c:
                    oc = clone(other_c)
                    convertFromText(oc)
                    
                    if cplength == other_cplength and other_c['p'][common] == c['p'][common]+1:
                        for op in oc['o']: 
                            c['sm'][1] = self.subtypes['text0'].apply(c['sm'][1], [op])
                    elif cplength == other_cplength and other_c['p'][common] == c['p'][common]:
                        for op in oc['o']:
                            c['sm'][0] = self.subtypes['text0'].apply(c['sm'][0], [op])
                            c['p'][-1] -= len(op['d'])  

            # backward compatibility for old string ops
            oc = other_c
            if ('si' in c or 'sd' in c) and ('si' in other_c or 'sd' in other_c):
                convertFromText(c)
                oc = clone(other_c)
                convertFromText(oc)
            
            # handle subtype ops
            if 't' in oc and self.subtypes[oc['t']]:
                if 't' in c and c['t'] == oc['t']:
                    res = self.subtypes[c['t']].transform(c['o'], oc['o'], type)
    
                    # convert back to old string ops
                    if 'si' in c or 'sd' in c:
                        p = c['p']
                        for r in res:
                            c['o'] = [r]
                            c['p'] = p[:]
                            convertToText(c)
                            self.append(dest, c)
                    elif not is_array(res) or len(res) > 0:
                        c['o'] = res
                        self.append(dest, c)
    
                    return dest
            elif 'na' in other_c:
                # transform based on otherC
                pass
                # this case is handled below
            elif 'li' in other_c and 'ld' in other_c:
                if other_c['p'][common] == c['p'][common]:
                    # noop
    
                    if not common_operand:
                        return dest
                    elif 'ld' in c:
                        # we're trying to delete the same element, -> noop
                        if 'li' in c and type == 'left':
                            # we're both replacing one element with another. only one can survive
                            c['ld'] = clone(other_c['li'])
                        else:
                            return dest
                    elif 'li' in c:
                        if c['p'][common] == 0:
                            if type == 'left':
                                c['ld'] = clone(other_c['li'])
                            else:
                                return dest
                        elif c['p'][common] == 1:
                            if is_dict(c['li']) and is_dict(other_c['li']):
                                if type == 'left':
                                    c['ld'] = other_c['li']
                                else:
                                    return dest
                            elif not is_dict(c['li']) and is_dict(other_c['li']):
                                c['p'][common] += 1
                    elif 'ss' in c:
                        op_a = {'p': other_c['p'], 'ld': other_c['li'], 'li': clone(other_c['li'])}
                        op_b = {'p': clone(other_c['p']), 'li': clone(other_c['li'])}
                        
                        op_b['p'][common] += 1
                        
                        opa_replaced = find_replace(other_c['ld'], op_a['li'], c['ss'][0])
                        opb_replaced = find_replace(other_c['ld'], op_b['li'], c['ss'][1])
                        
                        if opa_replaced and opb_replaced:
                            self.append(dest, op_a)
                            self.append(dest, op_b)
                            return dest
                        else:
                            return dest
                if 'sm' in c:
                    if common_operand and (other_c['p'][common] == c['p'][common] or other_c['p'][common] == c['p'][common]+1):
                        return dest
            elif 'li' in other_c:
                if 'li' in c and 'ld' in c and common_operand and c['p'][common] == other_c['p'][common]:
                    if c['p'][common] == 0:
                        if type == 'right':
                            return dest
                        else:
                            c['p'][common] += 1
                    elif c['p'][common] == 1 and is_dict(c['li']) and is_dict(other_c['li']):
                        if type == 'right':
                            del c['li']
                            c['p'][common] += 1
                        else:
                            other = {'p': clone(c['p']), 'ld': clone(c['ld'])}
                            other['p'][common] += 1
                            
                            c['ld'] = other_c['li']
                            
                            self.append(dest, c)
                            self.append(dest, other)
                            return dest
                    elif c['p'][common] == 1 and is_dict(c['li']) and not is_dict(other_c['li']):
                        op_a = clone(c)
                        del op_a['ld']
                        
                        op_b = clone(c)
                        del op_b['li']
                        op_b['p'][common] += 2
                        
                        self.append(dest, op_a)
                        self.append(dest, op_b)
                        return dest
                    else:
                        c['p'][common] += 1
                elif 'li' in c and 'ld' not in c and common_operand and c['p'][common] == other_c['p'][common]:
                    
                    # JsonML specific needs. If two people try and enter the same tag name at the same spot, dont add the second one
                    if c['p'][common] == 1 and not is_dict(c['li']) and is_dict(other_c['li']):
                        # If there is a dictionary, it has to be the second element. Non-dictionaries come after that
                        c['p'][common] += 1
                    elif c['p'][common] == 1 and is_dict(c['li']) and not is_dict(other_c['li']):
                        pass
                    elif type == 'left':
                        if c['p'][common] == 0:
                            # "0" is a special point in JsonML which relates to tag name. We cant shift it down and add another tag name. Only one can survive
                            c['ld'] = clone(other_c['li'])
                        elif c['p'][common] == 1 and is_dict(c['li']) and is_dict(other_c['li']):
                            # "1" is a special point in JsonML which relates to attributes. We cant shift it down and add another dict. Only one can survive
                            c['ld'] = clone(other_c['li'])
                    elif type == 'right': 
                        if c['p'][common] == 0:
                            # "0" is a special point in JsonML which relates to tag name. We cant shift it down and add another tag name. Only one can survive
                            return dest
                        elif c['p'][common] == 1 and is_dict(c['li']) and is_dict(other_c['li']):
                            # "1" is a special point in JsonML which relates to attributes. We cant shift it down and add another dict. Only one can survive
                            return dest
                        else:
                            # Any other element in array can shift the other ones down
                            c['p'][common] += 1
                elif 'sm' in c and common_operand and c['p'][common]+1 == other_c['p'][common]:
                    c['p'].pop()
                    
                    op_a = {'p': c['p'], 'ld': c['sm'][0], 'li': ''.join(c['sm'])}
                    
                    b_p = clone(c['p'])
                    b_p[common] += 2
                    
                    op_b = {'p': b_p, 'ld': c['sm'][1]}
                    
                    self.append(dest, op_a)
                    self.append(dest, op_b)
                    return dest
                            
                elif other_c['p'][common] <= c['p'][common]:
                    c['p'][common] += 1
    
                if 'lm' in c:
                    if common_operand:
                        # otherC edits the same list we edit
                        if other_c['p'][common] <= c['lm']:
                            c['lm'] += 1
                            # changing c.from is handled above.
            elif 'ld' in other_c:
                if 'lm' in c:
                    if common_operand:
                        if other_c['p'][common] == c['p'][common]:
                            # they deleted the thing we're trying to move
                            return dest
                        
                        # otherC edits the same list we edit
                        p = other_c['p'][common]
                        frm = c['p'][common]
                        to = c['lm']
                        if p < to or (p == to and frm < to):
                            c['lm'] -= 1

                if other_c['p'][common] < c['p'][common]:
                    c['p'][common] -= 1
                elif other_c['p'][common] == c['p'][common]:
                    if other_cplength < cplength:
                        # we're below the deleted element, so -> noop
                        return dest
                    elif 'ld' in c:
                        if 'li' in c:
                            # we're replacing, they're deleting. we become an insert.
                            del c['ld']
                        else:
                            # we're trying to delete the same element, -> noop
                            return dest
                    elif 'ss' in c or 'sm' in c:
                        return dest
                elif common_operand and other_c['p'][common] == c['p'][common]+1 and 'sm' in c:
                    return dest
                    
            elif 'ss' in other_c:
                if other_c['p'][common] < c['p'][common]:
                    c['p'][common] += 1
                elif 'ld' in c and 'li' in c and other_c['p'][common] == c['p'][common] and common_operand:
                    op_a = {'p': c['p'], 'ld': other_c['ss'][0], 'li': clone(c['li'])}
                    op_b = {'p': clone(c['p']), 'ld': other_c['ss'][1], 'li': clone(c['li'])}
                    op_b['p'][common] += 1
        
                    opa_replaced = find_replace(c['ld'], op_a['li'], other_c['ss'][0])
                    opb_replaced = find_replace(c['ld'], op_b['li'], other_c['ss'][1])
                    
                    if not opa_replaced or not opb_replaced:
                        del op_b['li']
                    
                    self.append(dest, op_a)
                    self.append(dest, op_b)
                    return dest
                elif 'ld' in c and other_c['p'][common] == c['p'][common] and common_operand:
                    new_op = {'p': c['p'], 'ld': other_c['ss'][0]}
                    additional_op = {'p': clone(c['p']), 'ld': other_c['ss'][1]}
                        
                    self.append(dest, new_op)
                    self.append(dest, additional_op)
                    return dest
                elif 'si' in c and other_c['p'][common] == c['p'][common] and cplength == other_cplength:
                    if c['p'][-1] > other_c['p'][-1]:
                        c['p'][common] += 1
                        c['p'][-1] -= other_c['p'][-1]
                elif 'sd' in c and other_c['p'][common] == c['p'][common] and cplength == other_cplength:
                    c_p = c['p'][-1]
                    other_c_p = other_c['p'][-1]
                    sd_len = len(c['sd'])
                    
                    if c_p >= other_c_p:
                        c['p'][common] += 1
                        c['p'][-1] -= other_c_p
                    elif c_p < other_c_p and c_p + sd_len > other_c_p:
                        split_point = other_c_p - c_p
                        first_mod = c['sd'][:split_point]
                        second_mod = c['sd'][split_point:]
                        
                        p = clone(c['p'])
                        p[common] += 1
                        p[-1] = 0
                        
                        self.append(dest, {'p': c['p'], 'sd': first_mod})
                        self.append(dest, {'p': p, 'sd': second_mod})
                        return dest
                elif 'sm' in c and cplength == other_cplength:
                    if other_c['p'][common] == c['p'][common]+1:
                        c['sm'][1] = other_c['ss'][0]
                    elif other_c['p'][common] == c['p'][common] and other_c['p'][-1] <= c['p'][-1]:
                        rem_len = len(other_c['ss'][0])
                        c['p'][-1] -= rem_len
                        c['p'][common] += 1
                        c['sm'][0] = c['sm'][0][rem_len:]
                elif 'ss' in c and cplength == other_cplength and c['p'][common] == other_c['p'][common]:
                    if other_c['p'][-1] == c['p'][-1]:
                        return dest
                    elif other_c['p'][-1] > c['p'][-1]:
                        c['ss'][1] = c['ss'][1][:len(c['ss'][1]) - len(other_c['ss'][1])]
                    else:
                        first_len = len(other_c['ss'][0])
                        c['ss'][0] = c['ss'][0][first_len:]
                        c['p'][common] += 1
                        c['p'][-1] -= first_len
                        
                    
            elif 'sm' in other_c:
                if other_c['p'][common]+1 < c['p'][common]:
                    c['p'][common] -= 1
                elif 'ld' in c and common_operand:
                    if other_c['p'][common] == c['p'][common]:
                        #TODO: Make sure sd == ld
                        p = clone(c['p'])
                        p.append(0)
                        
                        self.append(dest, {'p': p, 'sd': other_c['sm'][0]})
                        
                        if 'li' in c:
                            del c['ld']
                        else:
                            return dest
                        
                    elif other_c['p'][common]+1 == c['p'][common]:
                        #TODO: Make sure sd == ld
                        p = clone(c['p'])
                        p[common] -= 1
                        p.append(len(other_c['sm'][0]))
                        
                        self.append(dest, {'p': p, 'sd': other_c['sm'][1]})
                        
                        if 'li' in c:
                            del c['ld']
                        else:
                            return dest
                elif ('si' in c or 'sd' in c) and other_c['p'][common]+1 == c['p'][common] and cplength == other_cplength:
                    c['p'][-1] += other_c['p'][-1]
                    c['p'][common] -= 1
                
                elif 'ss' in c and cplength == other_cplength:
                    if other_c['p'][common]+1 == c['p'][common]:
                        c['ss'][0] = other_c['sm'][0] + c['ss'][0]
                        c['p'][-1] += len(other_c['sm'][0])
                        c['p'][common] -= 1
                    elif other_c['p'][common] == c['p'][common] and other_c['p'][-1] >= c['p'][-1]:
                        c['ss'][1] = c['ss'][1] + other_c['sm'][1]
                
                elif 'sm' in c and cplength == other_cplength:
                    if other_c['p'][-1] == c['p'][-1] and c['p'][common] == other_c['p'][common]:
                        return dest
                    elif c['p'][common]+1 == other_c['p'][common]:
                        c['sm'][1] += other_c['sm'][1]
                    elif c['p'][common] == other_c['p'][common]+1:
                        c['sm'][0] = other_c['sm'][0] + c['sm'][0]
                        c['p'][-1] += len(other_c['sm'][0])
                        c['p'][common] -= 1
                        
            elif 'lm' in other_c:
                if 'lm' in c and cplength == other_cplength:
                    # lm vs lm, here we go!
                    frm = c['p'][common]
                    to = c['lm']
                    other_frm = other_c['p'][common]
                    other_to = other_c['lm']
                    if other_frm != other_to:
                        # if otherFrom == otherTo, we don't need to change our op.

                        #where did my thing go?
                        if frm == other_frm:
                            # they moved it! tie break.
                            if type == 'left':
                                c['p'][common] = other_to
                                if frm == to: 
                                    # ugh
                                    c['lm'] = other_to
                            else:
                                return dest
            
                        else:
                            # they moved around it
                            if frm > other_frm: 
                                c['p'][common] -= 1
                            
                            if frm > other_to:
                                c['p'][common] += 1
                                 
                            elif frm == other_to:
                                if other_frm > other_to:
                                    c['p'][common] += 1
                                    if frm == to:
                                        # ugh, again
                                        c['lm'] += 1

                            # step 2: where am i going to put it?
                            if to > other_frm:
                                c['lm'] -= 1
                            elif to == other_frm:
                                if to > frm:
                                    c['lm'] -= 1
                                    
                            if to > other_to:         
                                c['lm'] += 1
                            elif to == other_to:
                                # if we're both moving in the same direction, tie break
                                if (other_to > other_frm and to > frm) or (other_to < other_frm and to < frm):
                                    if type == 'right':
                                        c['lm'] += 1
                                else:
                                    if to > frm: 
                                        c['lm'] += 1
                                    elif to == other_frm:
                                        c['lm'] -= 1
                elif 'li' in c and 'ld' not in c and common_operand:
                    frm = other_c['p'][common]
                    to = other_c['lm']
                    p = c['p'][common]
                    if p > frm:
                        c['p'][common] -= 1
                    if p > to: 
                        c['p'][common] += 1
                else:
                    # ld, ld+li, si, sd, na, oi, od, oi+od, any li on an element beneath
                    # the lm
        
                    #i.e. things care about where their item is after the move.
                    frm = other_c['p'][common]
                    to = other_c['lm']
                    p = c['p'][common]
                    if p == frm:
                        c['p'][common] = to
                    else:
                        if p > frm: 
                            c['p'][common] -= 1
                        if p > to: 
                            c['p'][common] += 1
                        elif p == to and frm > to:
                            c['p'][common] += 1
            elif 'oi' in other_c and 'od' in other_c:
                if common == -1 or c['p'][common] == other_c['p'][common]:
                    if 'oi' in c and common_operand:
                        # we inserted where someone else replaced
                        if type == 'right':
                            # left wins
                            return dest
                        else:
                            # we win, make our op replace what they inserted
                            c['od'] = other_c['oi']
                    else:
                        # -> noop if the other component is deleting the same object (or any parent)
                        return dest

            elif 'oi' in other_c:
                if common == -1 or 'oi' in c and c['p'][common] == other_c['p'][common]:
                    # left wins if we try to insert at the same place
                    if type == 'left':
                        self.append(dest, {'p': c['p'], 'od': other_c['oi']})
                    else:
                        return dest 
                    
            elif 'od' in other_c:
                if common == -1 or c['p'][common] == other_c['p'][common]:
                    if not common_operand:
                        return dest
        
                    if 'oi' in c:
                        del c['od']
                    else:
                        return dest

        self.append(dest, c)
        return dest
