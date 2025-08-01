import scrapy
from won7_scrapy.items import Won7ScrapyItem

class Won7BotSpider(scrapy.Spider):
    name = "won7_bot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io"]

    def start_requests(self):
        urls = self.start_urls
        urls.extend([f"https://davelee-fun.github.io/page{i}" for i in range(2, 7)])
        for url in urls :
            yield scrapy.Request(url, self.parse)
        
        
      


    def parse(self, response):
        products = response.css("div.card.h-100")
        for product in products :
            item = Won7ScrapyItem()
            item["title"] = product.css("h4.card-text::text").get()
            item["link"] = product.css("div.maxthumb > a::attr(href)").get()
            item["category"] = product.css("a.text-dark::text").get()
            item["main"] = product.css("span.post-name > a::text").get()
            item["date"] = product.css("span.post-date::text").get()
            yield item
            