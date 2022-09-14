from bs4 import BeautifulSoup


class JsonML:
    @classmethod
    def from_html(self, html):
        html = html.replace("<br>", "<br />")
        soup = BeautifulSoup(html, 'html.parser')
        
        return JsonML.__parse(soup)
        
    @classmethod
    def __parse(self, soup):
        if len(soup.contents) == 1:
            return JsonML.__tag(soup.contents[0])
        else:
            raise Exception('Must have a single root element')
          
    @classmethod  
    def __tag(self, current):
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
    

if __name__ == '__main__':    
    jsonml = JsonML.from_html('''<html>test<br>more test<ul class="pagehead-actions">
          <li>
              <a href="/login?return_to=%2Ftimdown%2Frangy"
            class="btn btn-sm btn-with-count tooltipped tooltipped-n"
            aria-label="You must be signed in to watch a repository" rel="nofollow">
            <svg aria-hidden="true" class="octicon octicon-eye" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path d="M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z"></path></svg>
            Watch
          </a>
          <a class="social-count" href="/timdown/rangy/watchers">
            76
          </a>
        
          </li>
        
          <li>
              <a href="/login?return_to=%2Ftimdown%2Frangy"
            class="btn btn-sm btn-with-count tooltipped tooltipped-n"
            aria-label="You must be signed in to star a repository" rel="nofollow">
            <svg aria-hidden="true" class="octicon octicon-star" height="16" version="1.1" viewBox="0 0 14 16" width="14"><path d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74z"></path></svg>
            Star
          </a>
        
            <a class="social-count js-social-count" href="/timdown/rangy/stargazers">
              1,056
            </a>
        
          </li>
        
          <li>
              <a href="/login?return_to=%2Ftimdown%2Frangy"
                class="btn btn-sm btn-with-count tooltipped tooltipped-n"
                aria-label="You must be signed in to fork a repository" rel="nofollow">
                <svg aria-hidden="true" class="octicon octicon-repo-forked" height="16" version="1.1" viewBox="0 0 10 16" width="10"><path d="M8 1a1.993 1.993 0 0 0-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 0 0 2 1a1.993 1.993 0 0 0-1 3.72V6.5l3 3v1.78A1.993 1.993 0 0 0 5 15a1.993 1.993 0 0 0 1-3.72V9.5l3-3V4.72A1.993 1.993 0 0 0 8 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>
                Fork
              </a>
        
            <a href="/timdown/rangy/network" class="social-count">
              163
            </a>
          </li>
        </ul></html>''')
    
    print(jsonml)