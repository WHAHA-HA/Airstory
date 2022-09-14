from bs4 import BeautifulSoup


class JsonML:
    @classmethod
    def from_html(cls, html):
        html = html.replace("<br>", "<br />")
        soup = BeautifulSoup(html, 'html.parser')
        
        return JsonML.__parse(soup)
    
    @classmethod
    def to_html(cls, jsonml):
        html = JsonML.__convert(jsonml)
        soup = BeautifulSoup(html, 'html.parser')

        return soup.prettify()
                
    @classmethod
    def __convert(cls, jsonml):
        if isinstance(jsonml, list):
            html = []
            tag = None
            length = len(jsonml)
            
            for x in range(length):
                if x == 0:
                    tag = jsonml[x].lower()
                    
                    html.append('<')
                    html.append(tag)
                    html.append('>')
                elif x == 1 and isinstance(jsonml[x], dict):
                    attributes = []
                    for key in jsonml[x]:
                        val = jsonml[x][key].replace('"', "'")
                        
                        attributes.append(key + '="' + val + '"')
                        
                    html.insert(2, ' ' + ' '.join(attributes))
                else:
                    child = JsonML.__convert(jsonml[x])
                    html.append(child)
                    
            if length == 1 or (length == 2 and isinstance(jsonml[1], dict)):
                html.insert(len(html) - 1, '/')
            else:
                html.append('</')
                html.append(tag)
                html.append('>')
                
            return ''.join(html)
        else:
            return jsonml
        
    @classmethod
    def __parse(cls, soup):
        if len(soup.contents) == 1:
            return JsonML.__tag(soup.contents[0])
        else:
            raise Exception('Must have a single root element')
          
    @classmethod  
    def __tag(cls, current):
        if isinstance(current, str):
            return current
        else:
            t = [current.name.upper()]
            
            attr = {}
            
            for key in current.attrs:
                if isinstance(current.attrs[key], list):
                    attr[key] = ' '.join(current.attrs[key])
                else:
                    attr[key] = current.attrs[key]
            if attr:
                t.append(attr)
            
            for child in current.children:
                child_tag = JsonML.__tag(child)
                t.append(child_tag)
            
            return t