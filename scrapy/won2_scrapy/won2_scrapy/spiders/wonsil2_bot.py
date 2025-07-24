import scrapy


class Wonsil2BotSpider(scrapy.Spider):
    name = "wonsil2_bot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io/"]

    def parse(self, response):
        pass
