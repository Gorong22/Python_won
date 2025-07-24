import scrapy


class WonsilBotSpider(scrapy.Spider):
    name = "wonsil_bot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io/"]

    def parse(self, response):

        #field

        #CSS Selector
        title = response.css("h1.sitetitle::text").get()
        #XPATH 
        description = response.xpath("//p[@class='lead']/text()").get()

        # 크롤링에 성공한 데이터를 딕셔너리의 형태로 저장하겠다 라는 뜻                                     
        yield {
            "title": title,
            "description" : description.strip()
        }
