<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:dp="http://www.datapower.com/extensions"
                extension-element-prefixes="dp"
                exclude-result-prefixes="dp"
>
    <xsl:template match="/">

        <!-- Retrieves content-tye of the request -->
        <xsl:variable name="type" select="dp:variable('var://context/_apimgmt/policy-output-mediaType')"/>

        <!-- indicate what the GatewayScript produced as output for a conditional action later -->
        <xsl:choose>
            <xsl:when test="$type = 'application/json'" >
                <xsl:element name="info">
                    <xsl:element name="is-json"><xsl:text>true</xsl:text></xsl:element>
                </xsl:element>
            </xsl:when>
            <xsl:otherwise>
                <xsl:element name="info">
                    <xsl:element name="is-json"><xsl:text>false</xsl:text></xsl:element>
                </xsl:element>
            </xsl:otherwise>
        </xsl:choose>

    </xsl:template>

</xsl:stylesheet>